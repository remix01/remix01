import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('povprasevanja')
      .select('id,location_city,kategorija,created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    const items = (data || []).map((item: any) => ({
      id: item.id,
      city: item.location_city || 'neznano mesto',
      category: item.kategorija || 'splošno storitev',
      createdAt: item.created_at,
    }))

    return ok({ items })
  } catch (error) {
    console.error('[home/activity] Failed to load activity:', error)
    return ok({ items: [] })
  }
}
