import { supabaseAdmin } from '@/lib/supabase-admin'
import { craftworkerSuspensionEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/sender'

type SuspendResult = {
  closedConversations: number
}

export async function suspendCraftworkerWithSideEffects(craftworkerId: string, reason: string): Promise<SuspendResult> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('craftworker_profile')
    .select('*, user:user_id(*)')
    .eq('user_id', craftworkerId)
    .single()

  if (profileError || !profile) throw new Error('Craftworker not found')
  if (profile.is_suspended) return { closedConversations: 0 }

  const { error: updateError } = await supabaseAdmin
    .from('craftworker_profile')
    .update({
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
    })
    .eq('user_id', craftworkerId)

  if (updateError) throw new Error(updateError.message)

  const { data: activeJobs, error: jobsError } = await supabaseAdmin
    .from('job')
    .select('*, conversation:conversation_id(*)')
    .eq('craftworker_id', craftworkerId)
    .in('status', ['MATCHED', 'IN_PROGRESS'])

  if (jobsError) throw new Error(jobsError.message)

  for (const job of activeJobs || []) {
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
            closed_at: new Date().toISOString(),
          })
          .eq('id', job.conversation.id)
      } catch (error) {
        console.error(`[suspend] Error closing conversation for job ${job.id}:`, error)
      }
    }
  }

  const contactEmail = process.env.ADMIN_EMAIL || 'info@liftgo.net'
  const emailTemplate = craftworkerSuspensionEmail(profile.user.name, reason, contactEmail)
  await sendEmail(profile.user.email, emailTemplate)

  return {
    closedConversations: (activeJobs || []).filter((j: any) => j.conversation).length,
  }
}

