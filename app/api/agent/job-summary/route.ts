/**
 * Job Summary Agent — async via QStash
 *
 * POST: Enqueues summary generation job, returns jobId immediately
 * GET:  Returns current status/result of a summary job
 * PUT:  Send summary to customer (narocnik)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enqueue } from '@/lib/jobs/queue'
import { enforceLimit } from '@/lib/agent/tokenTracker'

// POST — trigger async summary generation
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const limitCheck = await enforceLimit(user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.errorMsg }, { status: 429 })
    }

    const { ponudbaId, hoursWorked, materialsUsed, additionalNotes } = await req.json()
    if (!ponudbaId) {
      return NextResponse.json({ error: 'ID ponudbe je obvezen.' }, { status: 400 })
    }

    // Verify obrtnik owns this ponudba
    const { data: obrtnikProfile } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!obrtnikProfile) {
      return NextResponse.json({ error: 'Profil mojstra ni najden.' }, { status: 403 })
    }

    const { data: ponudba } = await supabaseAdmin
      .from('ponudbe')
      .select('id, obrtnik_id, povprasevanje_id, status')
      .eq('id', ponudbaId)
      .single()

    if (!ponudba || ponudba.obrtnik_id !== obrtnikProfile.id) {
      return NextResponse.json({ error: 'Ni dovoljenja.' }, { status: 403 })
    }

    // Check if summary already exists
    const { data: existing } = await supabaseAdmin
      .from('agent_job_summaries')
      .select('id, status, summary_text, generated_at')
      .eq('ponudba_id', ponudbaId)
      .maybeSingle()

    if (existing && existing.status !== 'draft') {
      return NextResponse.json({ existing, alreadyGenerated: true })
    }

    // Enqueue async job via QStash
    const jobId = await enqueue('generate_job_summary', {
      ponudbaId,
      obrtnikId: obrtnikProfile.id,
      userId: user.id,
      hoursWorked,
      materialsUsed,
      additionalNotes,
    })

    // Create placeholder record
    await supabaseAdmin
      .from('agent_job_summaries')
      .upsert(
        {
          ponudba_id: ponudbaId,
          obrtnik_id: obrtnikProfile.id,
          narocnik_id: user.id, // temporary, will be updated by worker
          summary_text: '',
          status: 'draft',
          job_id: jobId,
        },
        { onConflict: 'ponudba_id' }
      )

    return NextResponse.json({ jobId, status: 'pending', message: 'Povzetek se generira...' })
  } catch (error) {
    console.error('[agent/job-summary POST] error:', error)
    return NextResponse.json({ error: 'Napaka pri zahtevi za povzetek.' }, { status: 500 })
  }
}

// GET — poll for result
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const ponudbaId = req.nextUrl.searchParams.get('ponudbaId')
    if (!ponudbaId) {
      return NextResponse.json({ error: 'ponudbaId je obvezen.' }, { status: 400 })
    }

    const { data: summary } = await supabaseAdmin
      .from('agent_job_summaries')
      .select('*')
      .eq('ponudba_id', ponudbaId)
      .maybeSingle()

    if (!summary) {
      return NextResponse.json({ status: 'not_found' })
    }

    const ready = summary.summary_text && summary.summary_text.length > 0
    return NextResponse.json({
      status: ready ? 'ready' : 'pending',
      summary: ready ? summary : null,
    })
  } catch (error) {
    console.error('[agent/job-summary GET] error:', error)
    return NextResponse.json({ error: 'Napaka.' }, { status: 500 })
  }
}

// PUT — send summary to customer
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const { ponudbaId } = await req.json()
    if (!ponudbaId) return NextResponse.json({ error: 'ID ponudbe je obvezen.' }, { status: 400 })

    const { data: obrtnikProfile } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!obrtnikProfile) {
      return NextResponse.json({ error: 'Ni dovoljenja.' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('agent_job_summaries')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('ponudba_id', ponudbaId)
      .eq('obrtnik_id', obrtnikProfile.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[agent/job-summary PUT] error:', error)
    return NextResponse.json({ error: 'Napaka pri pošiljanju povzetka.' }, { status: 500 })
  }
}
