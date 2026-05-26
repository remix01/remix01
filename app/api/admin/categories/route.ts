import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    await requireAdmin()
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ categories: data || [] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri kategorijah.' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(['super_admin', 'support'])
    const body = await request.json()
    const payload = {
      name: body.name,
      name_slo: body.name_slo || null,
      slug: body.slug,
      description: body.description || null,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
      icon_name: body.icon_name || body.icon || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    }
    const { data, error } = await supabaseAdmin.from('categories').insert(payload).select('*').single()
    if (error) throw error
    return NextResponse.json({ category: data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri ustvarjanju kategorije.' }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(['super_admin', 'support'])
    const body = await request.json()
    const { id } = body
    const updates = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.name_slo !== undefined && { name_slo: body.name_slo || null }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.meta_title !== undefined && { meta_title: body.meta_title || null }),
      ...(body.meta_description !== undefined && { meta_description: body.meta_description || null }),
      ...((body.icon_name !== undefined || body.icon !== undefined) && { icon_name: body.icon_name || body.icon || null }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
    }
    const { data, error } = await supabaseAdmin.from('categories').update(updates).eq('id', id).select('*').single()
    if (error) throw error
    return NextResponse.json({ category: data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri posodobitvi kategorije.' }, { status })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(['super_admin'])
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri brisanju kategorije.' }, { status })
  }
}
