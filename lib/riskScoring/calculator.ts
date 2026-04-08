import { supabaseAdmin } from '@/lib/supabase-admin'

export type AlertLevel = 'none' | 'watch' | 'review' | 'critical'

export interface RiskResult {
  score: number
  flags: string[]
  alertLevel: AlertLevel
  details: Record<string, number>
}

const SUSPICIOUS_WORDS = [
  'whatsapp', 'viber', 'telegram', 'messenger', 'signal',
  'instagram', 'facebook', 'snapchat', 'tiktok',
  'kontakt zunaj', 'pogovor zunaj', 'klic', 'klici', 'pokličem',
  'pošlji mi', 'dodaj me', 'najdem te', 'naslov',
]

/**
 * Calculate risk score for a povpraševanje based on multiple factors.
 * Score range: 0–100 (higher = more risky)
 */
export async function calculateJobRisk(povprasevanjeId: string): Promise<RiskResult> {
  const { data: povp, error } = await supabaseAdmin
    .from('povprasevanja')
    .select('id, status, budget_max, created_at, obrtnik_id, location_city')
    .eq('id', povprasevanjeId)
    .maybeSingle()

  if (error || !povp) {
    throw new Error(`Povpraševanje ${povprasevanjeId} not found`)
  }

  let score = 0
  const flags: string[] = []
  const details: Record<string, number> = {}

  // 1. High budget (> 5000 EUR) → +15
  if (povp.budget_max && Number(povp.budget_max) > 5000) {
    score += 15
    details.highValue = 15
    flags.push(`Visoka vrednost: €${povp.budget_max}`)
  }

  // 2. Craftworker checks (if assigned)
  if (povp.obrtnik_id) {
    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('is_verified, avg_rating, total_reviews')
      .eq('id', povp.obrtnik_id)
      .maybeSingle()

    if (obrtnik) {
      if (!obrtnik.is_verified) {
        score += 20
        details.unverified = 20
        flags.push('Nepreverjen obrtnik')
      }
      const rating = Number(obrtnik.avg_rating ?? 5)
      const reviews = obrtnik.total_reviews ?? 0
      if (rating < 3.5 && reviews >= 5) {
        score += 25
        details.lowRating = 25
        flags.push(`Nizka ocena obrtnika: ${rating.toFixed(1)}`)
      }
    }
  }

  // 3. Suspicious words in messages → +15
  const { data: messages } = await supabaseAdmin
    .from('sporocila')
    .select('message')
    .eq('povprasevanje_id', povprasevanjeId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (messages && messages.length > 0) {
    const suspicious = messages.filter((m: any) =>
      SUSPICIOUS_WORDS.some((w: any) => m.message?.toLowerCase().includes(w))
    )
    if (suspicious.length > 0) {
      score += 15
      details.suspiciousWords = 15
      flags.push(`${suspicious.length} sporočil s sumljivimi besedami`)
    }
  }

  // 4. Stale: in progress > 7 days → +10
  const daysSince = Math.floor(
    (Date.now() - new Date(povp.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSince > 7 && povp.status === 'v_teku') {
    score += 10
    details.stale = 10
    flags.push(`Povpraševanje v teku že ${daysSince} dni`)
  }

  // Cap at 100
  score = Math.min(score, 100)

  let alertLevel: AlertLevel = 'none'
  if (score >= 90) alertLevel = 'critical'
  else if (score >= 70) alertLevel = 'review'
  else if (score >= 50) alertLevel = 'watch'

  const { error: upsertError } = await supabaseAdmin
    .from('risk_scores')
    .upsert(
      {
        povprasevanje_id: povprasevanjeId,
        score,
        flags,
        triggered_alert: score >= 70,
        alert_level: alertLevel,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'povprasevanje_id' }
    )

  if (upsertError) throw new Error(upsertError.message)

  return { score, flags, alertLevel, details }
}

/**
 * Get all active povpraševanja that need risk assessment.
 */
export async function getJobsForRiskCheck() {
  const { data, error } = await supabaseAdmin
    .from('povprasevanja')
    .select('id, status, budget_max, created_at, obrtnik_id')
    .in('status', ['odprto', 'v_teku'])

  if (error) throw new Error(error.message)
  return data ?? []
}
