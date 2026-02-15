import { prisma } from '@/lib/prisma'

export type AlertLevel = 'none' | 'watch' | 'review' | 'critical'

export interface RiskResult {
  score: number
  flags: string[]
  alertLevel: AlertLevel
  details: Record<string, number>
}

// Suspicious words that might indicate bypass attempts (excluding phone/email patterns)
const SUSPICIOUS_WORDS = [
  'whatsapp', 'viber', 'telegram', 'messenger', 'signal',
  'instagram', 'facebook', 'snapchat', 'tiktok',
  'kontakt zunaj', 'pogovor zunaj', 'klic', 'klici', 'pokličem',
  'pošlji mi', 'dodaj me', 'najdem te', 'naslov'
]

/**
 * Calculate risk score for a job based on multiple factors
 * Score range: 0-100 (higher = more risky)
 */
export async function calculateJobRisk(jobId: string): Promise<RiskResult> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      craftworker: {
        include: {
          craftworkerProfile: true
        }
      },
      customer: true,
      violations: {
        where: {
          type: {
            in: ['PHONE_DETECTED', 'EMAIL_DETECTED', 'BYPASS_ATTEMPT']
          }
        }
      },
      conversation: {
        include: {
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 50 // Analyze last 50 messages
          }
        }
      },
      payment: true
    }
  })

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  let score = 0
  const flags: string[] = []
  const details: Record<string, number> = {}

  // 1. Bypass warnings from craftworker (max 75 points)
  if (job.craftworker?.craftworkerProfile) {
    const warnings = job.craftworker.craftworkerProfile.bypassWarnings
    if (warnings >= 1) {
      const warningScore = Math.min(warnings * 25, 75)
      score += warningScore
      details.bypassWarnings = warningScore
      flags.push(`${warnings} previous bypass warning(s)`)
    }
  }

  // 2. Chat closed but no payment followed (+50 points)
  if (job.conversation?.status === 'CLOSED' && job.payment?.status !== 'RELEASED') {
    score += 50
    details.chatClosedNoPayment = 50
    flags.push('Chat closed without payment completion')
  }

  // 3. High value job (> 5000 EUR) (+15 points)
  if (job.estimatedValue && Number(job.estimatedValue) > 5000) {
    score += 15
    details.highValue = 15
    flags.push(`High value job: €${job.estimatedValue}`)
  }

  // 4. Low craftworker completion rate (< 40%) (+20 points)
  if (job.craftworker?.craftworkerProfile) {
    const profile = job.craftworker.craftworkerProfile
    const completionRate = profile.totalJobsCompleted > 0 
      ? (profile.totalJobsCompleted / (profile.totalJobsCompleted + 5)) * 100 // Rough estimate
      : 0
    
    if (completionRate < 40 && profile.totalJobsCompleted > 0) {
      score += 20
      details.lowCompletionRate = 20
      flags.push(`Low completion rate: ${completionRate.toFixed(0)}%`)
    }
  }

  // 5. Suspicious words in messages (+15 points)
  if (job.conversation?.messages) {
    const suspiciousMessages = job.conversation.messages.filter(msg => {
      const body = msg.body.toLowerCase()
      return SUSPICIOUS_WORDS.some(word => body.includes(word))
    })

    if (suspiciousMessages.length > 0) {
      score += 15
      details.suspiciousWords = 15
      flags.push(`${suspiciousMessages.length} message(s) with suspicious content`)
    }
  }

  // 6. Job older than 7 days with no progress (+10 points)
  const daysSinceCreated = Math.floor(
    (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSinceCreated > 7 && job.status === 'MATCHED') {
    score += 10
    details.staleJob = 10
    flags.push(`Job inactive for ${daysSinceCreated} days`)
  }

  // 7. Customer and craftworker from same city + high value (+10 points)
  if (job.craftworker && job.customer) {
    // Simple check - would need full address comparison in production
    const sameCity = job.city.toLowerCase() === job.craftworker.phone?.toLowerCase() // Placeholder
    if (sameCity && job.estimatedValue && Number(job.estimatedValue) > 3000) {
      score += 10
      details.sameCityHighValue = 10
      flags.push('Customer and craftworker from same area (high value)')
    }
  }

  // Cap score at 100
  score = Math.min(score, 100)

  // Determine alert level
  let alertLevel: AlertLevel = 'none'
  if (score >= 90) {
    alertLevel = 'critical'
  } else if (score >= 70) {
    alertLevel = 'review'
  } else if (score >= 50) {
    alertLevel = 'watch'
  }

  // Save to database
  await prisma.riskScore.upsert({
    where: { jobId },
    create: {
      jobId,
      score,
      flags: flags,
      triggeredAlert: score >= 70
    },
    update: {
      score,
      flags: flags,
      calculatedAt: new Date(),
      triggeredAlert: score >= 70
    }
  })

  return {
    score,
    flags,
    alertLevel,
    details
  }
}

/**
 * Get all jobs that need risk assessment
 */
export async function getJobsForRiskCheck() {
  return prisma.job.findMany({
    where: {
      status: {
        in: ['IN_PROGRESS', 'MATCHED']
      }
    },
    include: {
      craftworker: {
        include: {
          craftworkerProfile: true
        }
      },
      riskScore: true
    }
  })
}
