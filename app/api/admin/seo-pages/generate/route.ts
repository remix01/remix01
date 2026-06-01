import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { generateAndStorePage } from '@/lib/seo/ai-generator'
import { hasAnthropicAI } from '@/lib/env'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .maybeSingle()
  return data ? user : null
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasAnthropicAI()) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })

  const { locale, categorySlug, categoryName, citySlug, cityName } = await req.json()

  if (!locale || !categorySlug || !categoryName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await generateAndStorePage({
    locale,
    categorySlug,
    categoryName,
    citySlug,
    cityName,
  })

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
