import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    // Samo prijavljen partner (za svojo transakcijo) ali admin
    const cookieStore = await cookies()
    const { transactionId } = await params
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    // Verify user owns this transaction OR is admin
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('partner_id, customer_email')
      .eq('id', transactionId)
      .maybeSingle()

    if (!escrow) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Check if user is the partner, customer, or admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = profile?.role === 'admin'
    const isPartner = escrow.partner_id === user.id
    const isCustomer = escrow.customer_email === user.email

    if (!isAdmin && !isPartner && !isCustomer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: logs, error } = await supabaseAdmin
      .from('escrow_audit_log')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, logs })

  } catch (err) {
    console.error('[AUDIT QUERY]', err)
    return NextResponse.json({ success: false, logs: [] }, { status: 500 })
  }
}
