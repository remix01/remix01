import { NextRequest, NextResponse } from 'next/server'
import { calculateJobRisk, getJobsForRiskCheck } from '@/lib/riskScoring/calculator'
import { adminAlertEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/sender'
import { prisma } from '@/lib/prisma'

/**
 * Cron job to check risk scores for all active jobs
 * Runs every 4 hours via Vercel Cron
 * 
 * Authorization: Requires CRON_SECRET in Bearer token
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('[risk-check] Starting risk assessment for active jobs...')

  try {
    const jobs = await getJobsForRiskCheck()
    console.log(`[risk-check] Found ${jobs.length} jobs to check`)

    const results = {
      checked: 0,
      watch: 0,
      review: 0,
      critical: 0,
      errors: 0
    }

    for (const job of jobs) {
      try {
        const risk = await calculateJobRisk(job.id)
        results.checked++

        console.log(`[risk-check] Job ${job.id}: score=${risk.score}, level=${risk.alertLevel}`)

        // Handle based on alert level
        if (risk.alertLevel === 'watch') {
          results.watch++
          // Just log, no action needed
          console.log(`[risk-check] Job ${job.id} on watch list`)
        } 
        else if (risk.alertLevel === 'review') {
          results.review++
          
          // Send email to admin
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@liftgo.net'
          const emailTemplate = adminAlertEmail(job.id, risk.score, risk.flags)
          
          await sendEmail(adminEmail, emailTemplate)
          console.log(`[risk-check] Sent review alert for job ${job.id}`)
        }
        else if (risk.alertLevel === 'critical') {
          results.critical++

          // Automatic actions for critical risk
          await handleCriticalRisk(job.id, risk.score, risk.flags)
          console.log(`[risk-check] Executed critical actions for job ${job.id}`)
        }
      } catch (error) {
        results.errors++
        console.error(`[risk-check] Error processing job ${job.id}:`, error)
      }
    }

    console.log('[risk-check] Completed:', results)

    return NextResponse.json({
      success: true,
      summary: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[risk-check] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Handle critical risk jobs - take immediate action
 */
async function handleCriticalRisk(jobId: string, score: number, flags: string[]) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      craftworker: {
        include: {
          craftworkerProfile: true
        }
      },
      conversation: true
    }
  })

  if (!job) return

  // 1. Set job status to DISPUTED
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'DISPUTED'
    }
  })
  console.log(`[handleCriticalRisk] Job ${jobId} set to DISPUTED`)

  // 2. Suspend craftworker temporarily
  if (job.craftworkerId && job.craftworker?.craftworkerProfile) {
    await prisma.craftworkerProfile.update({
      where: { userId: job.craftworkerId },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedReason: `Automatic suspension due to high risk score (${score}) on job ${jobId}`
      }
    })
    console.log(`[handleCriticalRisk] Craftworker ${job.craftworkerId} suspended`)
  }

  // 3. Close Twilio conversation if active
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

      // Send system message to conversation
      await twilio.conversations.v1
        .conversations(job.conversation.twilioConversationSid)
        .messages
        .create({
          author: 'system',
          body: '⚠️ Ta posel je v pregledu LiftGO tima zaradi suma kršitev pravil. Vsi komunikacijski kanali so začasno zaprti.'
        })

      console.log(`[handleCriticalRisk] Conversation ${job.conversation.id} closed`)
    } catch (error) {
      console.error('[handleCriticalRisk] Error closing Twilio conversation:', error)
    }
  }

  // 4. Send email alert to admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@liftgo.net'
  const emailTemplate = adminAlertEmail(jobId, score, flags)
  
  await sendEmail(adminEmail, emailTemplate)
  console.log(`[handleCriticalRisk] Admin alert sent for job ${jobId}`)
}
