import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

interface RouteContext {
  params: Promise<{ jobId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return fail('Unauthorized', 401)
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return fail('Forbidden', 403)
    }

    const { jobId } = await context.params

    const { data: job, error: jobError } = await supabaseAdmin
      .from('job')
      .select(`
        *,
        conversation:conversation_id(
          *,
          message(id, body, is_blocked, created_at, sender:user_id(name))
        ),
        violation(id, type, severity, detected_content, created_at),
        payment:payment_id(*)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return fail('Job not found', 404)
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

    return ok({
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
    return fail('Internal server error', 500)
  }
}
