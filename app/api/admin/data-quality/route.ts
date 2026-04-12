import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    await requireAdmin()
    const staleDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const [profiles, staleInquiries] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, email, phone, full_name').limit(4000),
      supabaseAdmin.from('povprasevanja').select('id, title, created_at, status').lt('created_at', staleDate).neq('status', 'zakljuceno').limit(100),
    ])

    const emailMap: Record<string, any[]> = {}
    const phoneMap: Record<string, any[]> = {}

    for (const p of profiles.data || []) {
      if (p.email) emailMap[p.email] = [...(emailMap[p.email] || []), p]
      if (p.phone) phoneMap[p.phone] = [...(phoneMap[p.phone] || []), p]
    }

    const duplicateUsers = [
      ...Object.values(emailMap).filter((rows) => rows.length > 1),
      ...Object.values(phoneMap).filter((rows) => rows.length > 1),
    ].flat()

    const { data: incompleteCraftworkers } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, logo_url')
      .or('business_name.is.null,logo_url.is.null')
      .limit(100)

    return NextResponse.json({
      duplicateUsers,
      incompleteCraftworkers: incompleteCraftworkers || [],
      staleInquiries: staleInquiries.data || [],
    })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri data quality.' }, { status })
  }
}
