import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const od  = searchParams.get('od')
  const do_ = searchParams.get('do')

  let query = supabaseAdmin
    .from('povprasevanja')
    .select('*, narocnik:narocnik_id(full_name, email)')
    .order('created_at', { ascending: false })

  if (od)  query = query.gte('created_at', od)
  if (do_) query = query.lte('created_at', do_)

  const { data } = await query

  const headers = [
    'ID', 'Naslov', 'Lokacija', 'Stranka', 'Email', 'Telefon',
    'Status', 'Obrtnik ID', 'Datum od', 'Datum do',
    'Cena min', 'Cena max', 'Admin opomba', 'Ustvarjeno',
  ]

  const rows = (data || []).map(r => [
    r.id,
    r.title,
    r.location_city,
    r.narocnik && !Array.isArray(r.narocnik) ? (r.narocnik.full_name ?? '') : '',
    r.stranka_email ?? (r.narocnik && !Array.isArray(r.narocnik) ? (r.narocnik.email ?? '') : ''),
    r.stranka_telefon ?? '',
    r.status,
    r.obrtnik_id ?? '',
    r.preferred_date_from ?? '',
    r.preferred_date_to ?? '',
    r.budget_min ?? '',
    r.budget_max ?? '',
    r.admin_opomba ?? '',
    new Date(r.created_at).toLocaleString('sl-SI'),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="liftgo-povprasevanja-${Date.now()}.csv"`,
    },
  })
}
