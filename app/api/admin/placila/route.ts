import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, vloga')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch transactions from offers table
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select(`
        id,
        created_at,
        payment_amount,
        payment_status,
        povprasevanje:povprasevanja_id(
          narocnik:profiles(ime, priimek)
        ),
        obrtnik:obrtnik_id(ime, priimek)
      `)
      .not('payment_status', 'is', null)
      .order('created_at', { ascending: false })

    // Fetch payouts from payouts table
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select(`
        id,
        created_at,
        amount,
        stripe_transfer_id,
        status,
        obrtnik:obrtnik_id(ime, priimek)
      `)
      .order('created_at', { ascending: false })

    if (offersError || payoutsError) {
      throw new Error('Failed to fetch data')
    }

    // Format transactions
    const transactions = (offers || []).map((offer: any) => ({
      id: offer.id,
      date: offer.created_at,
      customer_name: offer.povprasevanje?.narocnik ? `${offer.povprasevanje.narocnik.ime} ${offer.povprasevanja.narocnik.priimek}` : 'N/A',
      obrtnik_name: offer.obrtnik ? `${offer.obrtnik.ime} ${offer.obrtnik.priimek}` : 'N/A',
      amount: offer.payment_amount || 0,
      payment_status: offer.payment_status,
    }))

    // Format payouts
    const formattedPayouts = (payouts || []).map((payout: any) => ({
      id: payout.id,
      date: payout.created_at,
      obrtnik_name: payout.obrtnik ? `${payout.obrtnik.ime} ${payout.obrtnik.priimek}` : 'N/A',
      amount: payout.amount || 0,
      stripe_transfer_id: payout.stripe_transfer_id || 'N/A',
      status: payout.status,
    }))

    // Calculate stats
    const stats = {
      totalTransactions: transactions.length,
      totalRevenue: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      pendingEscrow: transactions
        .filter(tx => tx.payment_status === 'pending')
        .reduce((sum, tx) => sum + tx.amount, 0),
      totalPayouts: formattedPayouts.reduce((sum, p) => sum + p.amount, 0),
    }

    // Check for CSV export
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format')

    if (format === 'csv') {
      // Generate CSV content
      const csvContent = generateCSV(transactions, formattedPayouts)
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="placila.csv"',
        },
      })
    }

    return NextResponse.json({
      transactions,
      payouts: formattedPayouts,
      stats,
    })
  } catch (error) {
    console.error('[API] Failed to fetch payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateCSV(transactions: any[], payouts: any[]): string {
  let csv = 'STRIPE TRANSAKCIJE\n'
  csv += 'Datum,Stranka,Obrtnik,Znesek,Status\n'

  transactions.forEach(tx => {
    csv += `"${new Date(tx.date).toLocaleDateString('sl-SI')}","${tx.customer_name}","${tx.obrtnik_name}","€${tx.amount.toFixed(2)}","${tx.payment_status}"\n`
  })

  csv += '\n\nIZPLAČILA OBRTNIKOV\n'
  csv += 'Datum,Obrtnik,Znesek,Stripe ID,Status\n'

  payouts.forEach(p => {
    csv += `"${new Date(p.date).toLocaleDateString('sl-SI')}","${p.obrtnik_name}","€${p.amount.toFixed(2)}","${p.stripe_transfer_id}","${p.status}"\n`
  })

  return csv
}
