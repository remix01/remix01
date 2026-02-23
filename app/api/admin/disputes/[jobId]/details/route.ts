import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface RouteContext {
  params: Promise<{ jobId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('role')
      .eq('email', user.email!)
      .single()

    if (userError || dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { jobId } = await context.params

    const { data: job, error: jobError } = await supabaseAdmin
      .from('job')
      .select(`
        *,
        conversation:conversation_id(
          *,
          message(id, body, is_blocked, created_at, sender:user_id(name), order_by: { created_at: asc })
        ),
        violation(id, type, severity, detected_content, created_at, order_by: { created_at: desc }),
        payment:payment_id(*)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const messages = (job.conversation?.message || []).map((msg: any) => ({
      id: msg.id,
      sender: msg.sender?.name || 'Unknown',
      body: msg.body,
      isBlocked: msg.is_blocked,
      sentAt: msg.created_at,
    }))

    const violations = (job.violation || []).map((v: any) => ({
      id: v.id,
      type: v.type,
      severity: v.severity,
      detectedContent: v.detected_content,
      createdAt: v.created_at,
    }))

    return NextResponse.json({
      messages,
      violations,
      payment: job.payment ? {
        amount: Number(job.payment.amount),
        platformFee: Number(job.payment.platform_fee),
        status: job.payment.status,
      } : null,
    })
  } catch (error) {
    console.error('[API] Failed to fetch dispute details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
