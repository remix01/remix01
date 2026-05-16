import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertLegacyWriteAllowed } from '@/lib/db/legacy-write-guard'

const CURRENT_TOS_VERSION = '2026-02-v1'

const acceptTermsSchema = z.object({
  tosVersion: z.literal(CURRENT_TOS_VERSION, {
    errorMap: () => ({ message: 'Invalid ToS version' }),
  }),
  craftworkerAgreement: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: unknown = await request.json()
    const parsed = acceptTermsSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { craftworkerAgreement } = parsed.data

    const updateData: Record<string, string> = {
      tos_accepted_at: new Date().toISOString(),
      tos_version: CURRENT_TOS_VERSION,
    }

    if (craftworkerAgreement) {
      updateData.craftworker_agreement_accepted_at = new Date().toISOString()
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from((assertLegacyWriteAllowed('user', 'app/api/auth/accept-terms/route.ts'), 'user'))
      .update(updateData)
      .eq('id', user.id)
      .select('id, tos_accepted_at, tos_version, craftworker_agreement_accepted_at')
      .single()

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        tosAcceptedAt: updatedUser?.tos_accepted_at,
        tosVersion: updatedUser?.tos_version,
        craftworkerAgreementAcceptedAt: updatedUser?.craftworker_agreement_accepted_at,
      },
    })
  } catch (error) {
    console.error('[accept-terms] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
