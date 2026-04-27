import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()

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
      ok: true,
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
    const authFailure = toAdminAuthFailure(error)
    if (authFailure.code === 'UNAUTHORIZED' || authFailure.code === 'FORBIDDEN') {
      return NextResponse.json(
        {
          ok: false,
          error: authFailure.message,
          canonical_error: {
            code: authFailure.code,
            message: authFailure.message,
          },
        },
        { status: authFailure.status }
      )
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        canonical_error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    )
  }
}
