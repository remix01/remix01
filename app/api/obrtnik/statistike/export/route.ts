import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!obrtnikProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: ponudbe } = await supabase
    .from('ponudbe')
    .select('id, created_at, status, price_estimate')
    .eq('obrtnik_id', obrtnikProfile.id)
    .order('created_at', { ascending: false })

  const { data: ocene } = await supabase
    .from('ocene')
    .select('created_at, rating')
    .eq('obrtnik_id', obrtnikProfile.id)
    .order('created_at', { ascending: false })

  const lines = ['tip,datum,status_ocena,znesek_eur']

  for (const offer of ponudbe || []) {
    lines.push(`ponudba,${offer.created_at},${offer.status || ''},${offer.price_estimate || 0}`)
  }

  for (const review of ocene || []) {
    lines.push(`ocena,${review.created_at},${review.rating || ''},`)
  }

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="statistika.csv"',
    },
  })
}

