import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const CURRENT_TOS_VERSION = '2026-02-v1'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tosVersion, craftworkerAgreement } = body

    // Validate version
    if (tosVersion !== CURRENT_TOS_VERSION) {
      return NextResponse.json(
        { error: 'Invalid ToS version' },
        { status: 400 }
      )
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        tosAcceptedAt: new Date(),
        tosVersion: CURRENT_TOS_VERSION,
        ...(craftworkerAgreement && {
          craftworkerAgreementAcceptedAt: new Date(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        tosAcceptedAt: updatedUser.tosAcceptedAt,
        tosVersion: updatedUser.tosVersion,
        craftworkerAgreementAcceptedAt: updatedUser.craftworkerAgreementAcceptedAt,
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
