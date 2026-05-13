import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'

export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch (error) {
    const failure = toAdminAuthFailure(error)
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim().toLowerCase()
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, business_name, created_at, is_verified, avg_rating')
    .order('created_at', { ascending: false })

  if (status === 'PENDING') {
    query = query.eq('is_verified', false)
  } else if (status === 'AKTIVEN') {
    query = query.eq('is_verified', true)
  }

  const { data: obrtniki, error } = await query
  if (error) return NextResponse.json({ error: 'Export failed' }, { status: 500 })

  const ids = (obrtniki || []).map((item) => item.id)
  let profileMap: Record<string, { email: string | null; phone: string | null }> = {}

  if (ids.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone')
      .in('id', ids)

    profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]))
  }

  const records = (obrtniki || [])
    .map((partner) => ({
      ...partner,
      email: profileMap[partner.id]?.email || '',
      phone: profileMap[partner.id]?.phone || '',
      statusLabel: partner.is_verified ? 'AKTIVEN' : 'PENDING',
    }))
    .filter((partner) => {
      if (!search) return true
      return (
        partner.business_name?.toLowerCase().includes(search) ||
        partner.email.toLowerCase().includes(search)
      )
    })

  const headers = ['ID', 'Ime podjetja', 'Email', 'Telefon', 'Status', 'Ocena', 'Registriran']
  const rows = records.map((partner) => [
    partner.id,
    partner.business_name || '',
    partner.email,
    partner.phone,
    partner.statusLabel,
    partner.avg_rating ?? 0,
    new Date(partner.created_at).toLocaleString('sl-SI'),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="liftgo-partnerji-${Date.now()}.csv"`,
    },
  })
}
