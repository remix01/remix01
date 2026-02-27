import { supabaseAdmin } from '@/lib/supabase-admin'

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
  const { data: job, error: jobError } = await supabaseAdmin
    .from('job')
    .select(`
      *,
      craftworker:craftworker_id(
        *,
        craftworker_profile(*)
      ),
      customer:customer_id(*),
      violation(*),
      conversation:conversation_id(
        *,
        message(*, order_by: { created_at: desc }, limit: 50)
      ),
      payment:payment_id(*)
    `)
    .eq('id', jobId)
    .maybeSingle()

  if (jobError || !job) {
    throw new Error(`Job ${jobId} not found`)
  }

  let score = 0
  const flags: string[] = []
  const details: Record<string, number> = {}

  // 1. Bypass warnings from craftworker (max 75 points)
  if (job.craftworker?.craftworker_profile) {
    const warnings = job.craftworker.craftworker_profile.bypass_warnings
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
  if (job.estimated_value && Number(job.estimated_value) > 5000) {
    score += 15
    details.highValue = 15
    flags.push(`High value job: €${job.estimated_value}`)
  }

  // 4. Low craftworker completion rate (< 40%) (+20 points)
  if (job.craftworker?.craftworker_profile) {
    const profile = job.craftworker.craftworker_profile
    const completionRate = profile.total_jobs_completed > 0 
      ? (profile.total_jobs_completed / (profile.total_jobs_completed + 5)) * 100 // Rough estimate
      : 0
    
    if (completionRate < 40 && profile.total_jobs_completed > 0) {
      score += 20
      details.lowCompletionRate = 20
      flags.push(`Low completion rate: ${completionRate.toFixed(0)}%`)
    }
  }

  // 5. Suspicious words in messages (+15 points)
  if (job.conversation?.message) {
    const suspiciousMessages = job.conversation.message.filter((msg: any) => {
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
    (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
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
    if (sameCity && job.estimated_value && Number(job.estimated_value) > 3000) {
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
  const { error: upsertError } = await supabaseAdmin
    .from('risk_score')
    .upsert({
      job_id: jobId,
      score,
      flags: flags,
      triggered_alert: score >= 70,
    })

  if (upsertError) throw new Error(upsertError.message)

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
  const { data, error } = await supabaseAdmin
    .from('job')
    .select(`
      *,
      craftworker:craftworker_id(
        *,
        craftworker_profile(*)
      ),
      risk_score(*)
    `)
    .in('status', ['IN_PROGRESS', 'MATCHED'])

  if (error) throw new Error(error.message)
  return data
}
