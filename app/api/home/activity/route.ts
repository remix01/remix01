import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('povprasevanja')
      .select('id,location_city,categories(name),created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    const items = (data || []).map((item: any) => ({
      id: item.id,
      city: item.location_city || 'neznano mesto',
      category: item.categories?.name || 'splošno storitev',
      createdAt: item.created_at,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('[home/activity] Failed to load activity:', error)
    return NextResponse.json({ items: [] })
  }
}
