/**
 * Task Orchestrator Integration - Main entry point
 *
 * This route integrates the Task Orchestrator with the Liquidity Engine.
 * When creating a task, automatically triggers matching and broadcasts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { taskOrchestrator } from '@/lib/services'
import { paymentService } from '@/lib/services'
import { liquidityEngine } from '@/lib/marketplace/liquidityEngine'
import { assertPonudbaTransition } from '@/lib/state/ponudbe-status'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, taskId, data } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Route to appropriate orchestrator action
    if (action === 'create_task') {
      const task = await taskOrchestrator.createTask(data)

      liquidityEngine.onNewRequest(
        data.requestId,
        data.lat,
        data.lng,
        data.categoryId,
        user.id
      ).catch(err => {
        console.error('[tasks] Liquidity engine error:', err)
      })

      return NextResponse.json({ success: true, data: task })
    }

    if (action === 'accept_offer') {
      const { ponudbaId } = data

      if (!taskId || !ponudbaId) {
        return NextResponse.json({ error: 'taskId and ponudbaId are required' }, { status: 400 })
      }

      // Verify user owns the task
      const { data: task, error: taskError } = await supabaseAdmin
        .from('service_requests')
        .select('id, status, narocnik_id')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        return NextResponse.json({ error: 'Naloga ni bila najdena' }, { status: 404 })
      }

      if (task.narocnik_id !== user.id) {
        return NextResponse.json({ error: 'Nimate dostopa do te naloge' }, { status: 403 })
      }

      // Fetch ponudba (validate narocnik_id for ownership)
      const { data: ponudba, error: ponudbaError } = await supabaseAdmin
        .from('ponudbe')
        .select('id, obrtnik_id, price_estimate, povprasevanje_id, narocnik_id, status')
        .eq('id', ponudbaId)
        .single()

      if (ponudbaError || !ponudba) {
        return NextResponse.json({ error: 'Ponudba ni bila najdena' }, { status: 404 })
      }

      if (ponudba.narocnik_id && ponudba.narocnik_id !== user.id) {
        return NextResponse.json({ error: 'Nimate dostopa do te ponudbe' }, { status: 403 })
      }

      // Validate transition before mutating any offer rows.
      // accepted is only reachable from offer_sent; matched→offer_sent is the
      // normal path when a craftsman submits a ponudba via the queue worker, but
      // the customer can accept directly while the task is still in matched.
      const currentStatus = task.status as import('@/lib/services/taskOrchestrator').TaskStatus
      if (currentStatus !== 'offer_sent' && currentStatus !== 'matched') {
        return NextResponse.json(
          { error: `Neveljavno stanje naloge za sprejem ponudbe: ${currentStatus}` },
          { status: 409 }
        )
      }

      // Advance to offer_sent so the orchestrator accepts the next transition.
      if (currentStatus === 'matched') {
        await taskOrchestrator.updateTaskStatus(taskId, 'offer_sent')
      }

      // Only mutate offer rows after the state machine gate has passed.
      assertPonudbaTransition(ponudba.status, 'sprejeta')
      await supabaseAdmin
        .from('ponudbe')
        .update({ status: 'sprejeta' })
        .eq('id', ponudbaId)

      // Reject other ponudbe for this povprasevanje
      await supabaseAdmin
        .from('ponudbe')
        .update({ status: 'zavrnjena' })
        .eq('povprasevanje_id', ponudba.povprasevanje_id)
        .neq('id', ponudbaId)
        .eq('status', 'poslana')

      await taskOrchestrator.updateTaskStatus(taskId, 'accepted', {
        customerId: user.id,
        partnerId: ponudba.obrtnik_id,
        offerId: ponudbaId,
        agreedPrice: ponudba.price_estimate ?? 0,
        amount: ponudba.price_estimate ?? 0,
      })

      return NextResponse.json({ success: true, data: { taskId, ponudbaId } })
    }

    if (action === 'start_task') {
      if (!taskId) {
        return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
      }

      // Verify user is the obrtnik assigned to this task
      const { data: task, error: taskError } = await supabaseAdmin
        .from('service_requests')
        .select('id, status, narocnik_id, povprasevanje_id')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        return NextResponse.json({ error: 'Naloga ni bila najdena' }, { status: 404 })
      }

      // Find the accepted ponudba to verify the user is the assigned obrtnik
      const { data: ponudba } = task.povprasevanje_id
        ? await supabaseAdmin
            .from('ponudbe')
            .select('obrtnik_id')
            .eq('povprasevanje_id', task.povprasevanje_id)
            .eq('status', 'sprejeta')
            .maybeSingle()
        : await supabaseAdmin
            .from('ponudbe')
            .select('obrtnik_id')
            .eq('narocnik_id', task.narocnik_id ?? '')
            .eq('status', 'sprejeta')
            .maybeSingle()

      if (!ponudba || ponudba.obrtnik_id !== user.id) {
        return NextResponse.json({ error: 'Nimate dostopa do te naloge' }, { status: 403 })
      }

      await taskOrchestrator.updateTaskStatus(taskId, 'in_progress')

      return NextResponse.json({ success: true, data: { taskId } })
    }

    if (action === 'complete_task') {
      if (!taskId) {
        return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
      }

      // Verify user owns the task (narocnik confirms completion)
      const { data: task, error: taskError } = await supabaseAdmin
        .from('service_requests')
        .select('id, status, narocnik_id, povprasevanje_id')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        return NextResponse.json({ error: 'Naloga ni bila najdena' }, { status: 404 })
      }

      if (task.narocnik_id !== user.id) {
        return NextResponse.json({ error: 'Nimate dostopa do te naloge' }, { status: 403 })
      }

      // Get accepted ponudba for partner + price info
      const { data: ponudba } = task.povprasevanje_id
        ? await supabaseAdmin
            .from('ponudbe')
            .select('obrtnik_id, price_estimate')
            .eq('povprasevanje_id', task.povprasevanje_id)
            .eq('status', 'sprejeta')
            .maybeSingle()
        : await supabaseAdmin
            .from('ponudbe')
            .select('obrtnik_id, price_estimate')
            .eq('narocnik_id', task.narocnik_id ?? '')
            .eq('status', 'sprejeta')
            .maybeSingle()

      if (!ponudba) {
        return NextResponse.json({ error: 'Sprejeta ponudba ni bila najdena' }, { status: 400 })
      }

      await taskOrchestrator.updateTaskStatus(taskId, 'completed', {
        customerId: user.id,
        partnerId: ponudba.obrtnik_id,
        finalPrice: ponudba.price_estimate ?? 0,
      })

      return NextResponse.json({ success: true, data: { taskId } })
    }

    if (action === 'get_task') {
      if (!taskId) {
        return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
      }

      const { data: task, error } = await supabaseAdmin
        .from('service_requests')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error || !task) {
        return NextResponse.json({ error: 'Naloga ni bila najdena' }, { status: 404 })
      }

      if (task.narocnik_id !== user.id) {
        return NextResponse.json({ error: 'Nimate dostopa do te naloge' }, { status: 403 })
      }

      return NextResponse.json({ success: true, data: task })
    }

    if (action === 'list_tasks') {
      const { data: tasks, error } = await supabaseAdmin
        .from('service_requests')
        .select('*')
        .eq('narocnik_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Napaka pri nalaganju nalog' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: tasks ?? [] })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[tasks] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
