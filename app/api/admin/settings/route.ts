import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    await requireAdmin()

    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('logo_url, hero_image_url, favicon_url')
      .eq('id', 1)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ success: true, data: data || null })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ success: false, error: 'Napaka pri nalaganju nastavitev.' }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const payload = {
      id: 1,
      logo_url: body.logo_url ?? null,
      hero_image_url: body.hero_image_url ?? null,
      favicon_url: body.favicon_url ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .upsert(payload)
      .select('logo_url, hero_image_url, favicon_url')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ success: false, error: 'Napaka pri shranjevanju nastavitev.' }, { status })
  }
}
