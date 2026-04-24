import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

export async function GET() {
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

    const { data: disputes, error } = await supabaseAdmin
      .from('job')
      .select(`
        id,
        title,
        customer:customer_id(name, email),
        craftworker:craftworker_id(name, email),
        payment:payment_id(amount, platform_fee, dispute_reason),
        violation(id),
        created_at
      `)
      .eq('status', 'DISPUTED')
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    const result = (disputes || []).map((job: any) => ({
      id: job.id,
      jobId: job.id,
      jobTitle: job.title,
      customer: job.customer,
      craftworker: job.craftworker || { name: 'N/A', email: '' },
      amount: Number(job.payment?.amount || 0),
      platformFee: Number(job.payment?.platform_fee || 0),
      disputeReason: job.payment?.dispute_reason,
      createdAt: job.created_at,
      daysOpen: Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      violationCount: (job.violation || []).length,
    }))

    return Response.json(result)
  } catch (error) {
    console.error('[API] Failed to fetch disputes:', error)
    return fail('Internal server error', 500)
  }
}
