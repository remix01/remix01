import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
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

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Failed to fetch disputes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
