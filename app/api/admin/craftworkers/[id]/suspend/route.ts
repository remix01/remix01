import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { suspendCraftworkerWithSideEffects } from '@/lib/admin/craftworker-suspension'

const suspendSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  durationDays: z.union([z.number().positive(), z.literal('permanent')])
})

/**
 * POST /api/admin/craftworkers/[id]/suspend
 * Suspend a craftworker account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = suspendSchema.parse(body)

    const { id: craftworkerId } = await params

    const result = await suspendCraftworkerWithSideEffects(craftworkerId, validatedData.reason)

    return NextResponse.json({
      success: true,
      message: 'Craftworker suspended successfully',
      craftworkerId,
      suspendedAt: new Date().toISOString(),
      closedConversations: result.closedConversations
    })

  } catch (error) {
    console.error('[suspend] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
