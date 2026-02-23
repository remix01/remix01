import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('*')
      .eq('email', user.email!)
      .single()

    if (userError || !dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = suspendSchema.parse(body)

    const craftworkerId = params.id

    // Get craftworker profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('craftworker_profile')
      .select('*, user:user_id(*)')
      .eq('user_id', craftworkerId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Craftworker not found' }, { status: 404 })
    }

    if (profile.is_suspended) {
      return NextResponse.json({ error: 'Craftworker already suspended' }, { status: 400 })
    }

    // Suspend the craftworker
    const { error: updateError } = await supabaseAdmin
      .from('craftworker_profile')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_reason: validatedData.reason
      })
      .eq('user_id', craftworkerId)

    if (updateError) throw new Error(updateError.message)

    console.log(`[suspend] Craftworker ${craftworkerId} suspended by admin ${dbUser.id}`)

    // Close all active Twilio conversations
    const { data: activeJobs, error: jobsError } = await supabaseAdmin
      .from('job')
      .select('*, conversation:conversation_id(*)')
      .eq('craftworker_id', craftworkerId)
      .in('status', ['MATCHED', 'IN_PROGRESS'])

    if (jobsError) throw new Error(jobsError.message)

    console.log(`[suspend] Found ${(activeJobs || []).length} active jobs to close`)

    for (const job of (activeJobs || [])) {
      if (job.conversation && job.conversation.status === 'ACTIVE') {
        try {
          const twilio = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          )

          await twilio.conversations.v1
            .conversations(job.conversation.twilio_conversation_sid)
            .update({ state: 'closed' })

          await supabaseAdmin
            .from('conversation')
            .update({
              status: 'SUSPENDED',
              closed_at: new Date().toISOString()
            })
            .eq('id', job.conversation.id)

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
      closedConversations: (activeJobs || []).filter(j => j.conversation).length
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
