import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

/**
 * POST — create a new partner record after signup
 */
export async function POST(req: Request) {
  try {
    const { user_id, company_name, email } = await req.json()

    if (!user_id || !company_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create partner record linked to the authenticated user
    const { data, error } = await supabaseAdmin
      .from('partners')
      .insert({
        user_id,
        podjetje: company_name,
        email,
        aktiven: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Partner creation error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating partner:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
