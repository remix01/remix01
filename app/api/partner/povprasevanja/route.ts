import { getPartner } from '@/lib/supabase-partner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

/**
 * GET — partner's assigned inquiries with filters
 */
export async function GET(req: Request) {
  const partner = await getPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 10
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('povprasevanja')
    .select('*', { count: 'exact' })
    .eq('obrtnik_id', partner.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'vse') query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}
