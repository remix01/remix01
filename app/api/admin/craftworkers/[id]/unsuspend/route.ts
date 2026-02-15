import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { craftworkerUnsuspensionEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/sender'

/**
 * POST /api/admin/craftworkers/[id]/unsuspend
 * Unsuspend a craftworker account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const craftworkerId = params.id

    // Get craftworker profile
    const profile = await prisma.craftworkerProfile.findUnique({
      where: { userId: craftworkerId },
      include: {
        user: true
      }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Craftworker not found' }, { status: 404 })
    }

    if (!profile.isSuspended) {
      return NextResponse.json({ error: 'Craftworker is not suspended' }, { status: 400 })
    }

    // Unsuspend the craftworker
    await prisma.craftworkerProfile.update({
      where: { userId: craftworkerId },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: null
      }
    })

    console.log(`[unsuspend] Craftworker ${craftworkerId} unsuspended by admin ${dbUser.id}`)

    // Send unsuspension email
    const emailTemplate = craftworkerUnsuspensionEmail(profile.user.name)
    await sendEmail(profile.user.email, emailTemplate)
    
    console.log(`[unsuspend] Unsuspension email sent to ${profile.user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Craftworker unsuspended successfully',
      craftworkerId,
      unsuspendedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[unsuspend] Error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
