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
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri kategorijah.' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(['super_admin', 'support'])
    const body = await request.json()
    const payload = {
      name: body.name,
      name_slo: body.name_slo || body.name,
      slug: body.slug,
      description: body.description || null,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
      icon: body.icon || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    }
    const { data, error } = await supabaseAdmin.from('categories').insert(payload).select('*').single()
    if (error) throw error
    return NextResponse.json({ category: data })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri ustvarjanju kategorije.' }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(['super_admin', 'support'])
    const body = await request.json()
    const { id, ...updates } = body
    const { data, error } = await supabaseAdmin.from('categories').update(updates).eq('id', id).select('*').single()
    if (error) throw error
    return NextResponse.json({ category: data })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
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
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri brisanju kategorije.' }, { status })
  }
}
