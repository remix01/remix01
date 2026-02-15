import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const CURRENT_TOS_VERSION = '2026-02-v1'
const NINETY_DAYS_IN_MS = 90 * 24 * 60 * 60 * 1000

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ shouldShowModal: false })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        tosAcceptedAt: true,
        tosVersion: true,
        craftworkerAgreementAcceptedAt: true,
      },
    })

    if (!dbUser || dbUser.role !== 'CRAFTWORKER') {
      return NextResponse.json({ shouldShowModal: false })
    }

    // Check if craftworker has accepted current terms
    const hasAcceptedCurrentTerms = 
      dbUser.tosVersion === CURRENT_TOS_VERSION &&
      dbUser.craftworkerAgreementAcceptedAt !== null

    if (hasAcceptedCurrentTerms) {
      return NextResponse.json({ shouldShowModal: false })
    }

    // Check if last acceptance was more than 90 days ago
    const shouldShow = 
      !dbUser.craftworkerAgreementAcceptedAt ||
      Date.now() - new Date(dbUser.craftworkerAgreementAcceptedAt).getTime() > NINETY_DAYS_IN_MS

    return NextResponse.json({ shouldShowModal: shouldShow })
  } catch (error) {
    console.error('[check-terms-acceptance] Error:', error)
    return NextResponse.json({ shouldShowModal: false })
  }
}
