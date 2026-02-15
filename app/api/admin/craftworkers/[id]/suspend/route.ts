import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { craftworkerSuspensionEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/sender'

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

    // Validate request body
    const body = await request.json()
    const validatedData = suspendSchema.parse(body)

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

    if (profile.isSuspended) {
      return NextResponse.json({ error: 'Craftworker already suspended' }, { status: 400 })
    }

    // Suspend the craftworker
    await prisma.craftworkerProfile.update({
      where: { userId: craftworkerId },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedReason: validatedData.reason
      }
    })

    console.log(`[suspend] Craftworker ${craftworkerId} suspended by admin ${dbUser.id}`)

    // Close all active Twilio conversations
    const activeJobs = await prisma.job.findMany({
      where: {
        craftworkerId,
        status: {
          in: ['MATCHED', 'IN_PROGRESS']
        }
      },
      include: {
        conversation: true
      }
    })

    console.log(`[suspend] Found ${activeJobs.length} active jobs to close`)

    for (const job of activeJobs) {
      if (job.conversation && job.conversation.status === 'ACTIVE') {
        try {
          const twilio = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          )

          await twilio.conversations.v1
            .conversations(job.conversation.twilioConversationSid)
            .update({ state: 'closed' })

          await prisma.conversation.update({
            where: { id: job.conversation.id },
            data: {
              status: 'SUSPENDED',
              closedAt: new Date()
            }
          })

          console.log(`[suspend] Closed conversation for job ${job.id}`)
        } catch (error) {
          console.error(`[suspend] Error closing conversation for job ${job.id}:`, error)
        }
      }
    }

    // Send suspension email to craftworker
    const contactEmail = process.env.ADMIN_EMAIL || 'info@liftgo.net'
    const emailTemplate = craftworkerSuspensionEmail(
      profile.user.name,
      validatedData.reason,
      contactEmail
    )

    await sendEmail(profile.user.email, emailTemplate)
    console.log(`[suspend] Suspension email sent to ${profile.user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Craftworker suspended successfully',
      craftworkerId,
      suspendedAt: new Date().toISOString(),
      closedConversations: activeJobs.filter(j => j.conversation).length
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
