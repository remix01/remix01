/**
 * Skill: matching-craftsmen
 *
 * Finds and ranks craftworkers for a job using real Supabase queries
 * against `craftworker_profile` (with `categories` and `service_areas` arrays).
 *
 * Requires the 20260330_skills_support migration to be applied.
 *
 * Triggers on: "najdi mojstr", "priporoči", "kateri", intent patterns.
 * Context: only when an active job exists (via context.activeResourceIds.inquiryId).
 */

import { createClient } from '@/lib/supabase/server'
import type { SkillDefinition, SkillResult } from '../types'
import type { AgentContext } from '../../context'
import { MATCHING_RULES } from '../matching-rules'
import { getPricingForCategory } from '../pricing-rules'
import { skillRegistry } from '../executor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Craftworker {
  id: string
  user_id: string
  avg_rating: number
  is_verified: boolean
  is_suspended: boolean
  total_jobs_completed: number
  package_type: 'START' | 'PRO'
  service_areas: string[]
  categories: string[]
  user: { id: string; name: string } | null
}

interface RankedMatch {
  craftworkerId: string
  name: string
  score: number
  reasons: string[]
  estimatedPrice: string
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
function score(cw: Craftworker, city: string, isUrgent: boolean): { score: number; reasons: string[] } {
  let pts = 0
  const reasons: string[] = []

  // Location
  const cwCity = (cw.service_areas ?? []).map(s => s.toLowerCase())
  if (cwCity.includes(city.toLowerCase())) {
    pts += MATCHING_RULES.location.sameCity
    reasons.push(`Pokriva ${city}`)
  }

  // Rating
  const rating = cw.avg_rating ?? 0
  if (rating >= 4.5) { pts += MATCHING_RULES.rating.above4_5; reasons.push(`Ocena ${rating.toFixed(1)} ★`) }
  else if (rating >= 4.0) { pts += MATCHING_RULES.rating.above4_0; reasons.push(`Ocena ${rating.toFixed(1)} ★`) }
  else if (rating >= 3.5) { pts += MATCHING_RULES.rating.above3_5 }
  else { pts += MATCHING_RULES.rating.below3_5 }

  // Urgency bonus for PRO craftworkers
  if (isUrgent && cw.package_type === 'PRO') {
    pts += MATCHING_RULES.urgency.nujno.locationBonus
    reasons.push('PRO paket (hiter odziv)')
  }

  // Completed jobs
  if (cw.total_jobs_completed >= 10) {
    pts += 10
    reasons.push(`${cw.total_jobs_completed} zaključenih del`)
  }

  return { score: Math.max(0, pts), reasons }
}

// ---------------------------------------------------------------------------
// Supabase query
// ---------------------------------------------------------------------------
async function fetchMatchingCraftworkers(
  category: string,
  city: string
): Promise<Craftworker[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('craftworker_profile')
    .select(`
      id,
      user_id,
      avg_rating,
      is_verified,
      is_suspended,
      total_jobs_completed,
      package_type,
      service_areas,
      categories,
      user:user_id (
        id,
        name
      )
    `)
    .eq('is_verified', true)
    .eq('is_suspended', false)
    .gte('avg_rating', MATCHING_RULES.minimumRequirements.minRating)
    .contains('categories', [category])
    .order('avg_rating', { ascending: false })
    .limit(20)

  if (error || !data) return []
  return data as unknown as Craftworker[]
}

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------
const matchingCraftsmenSkill: SkillDefinition = {
  name: 'matching-craftsmen',
  description: 'Najde in rangira najboljše mojstre za obstoječe povpraševanje',

  triggers: {
    keywords: [
      'najdi mojstr', 'poišči mojstr', 'kateri mojster', 'priporoči mojstr',
      'kdo je najboljši', 'primerjaj ponudbe', 'primerjaj mojstr',
    ],
    intentPatterns: [
      'kdo .+ lahko .+',
      'kateri .+ je najboljš',
      'priporoči .+ za .+',
    ],
    contextCheck: (context) => !!context.activeResourceIds?.inquiryId,
  },

  questions: [
    {
      field: 'category',
      question:
        'Za katero kategorijo storitve iščete mojstra?\n' +
        '(npr. vodovodna-dela, elektrika, slikopleskarstvo, ogrevanje-klima...)',
      required: true,
      validator: (a) => a.trim().length > 0 || 'Prosim navedite kategorijo storitve.',
    },
    {
      field: 'city',
      question: 'V katerem mestu potrebujete storitev?',
      required: true,
      validator: (a) => a.trim().length >= 2 || 'Prosim vnesite veljavno mesto.',
    },
    {
      field: 'urgency',
      question: 'Je delo nujno? (da / ne)',
      required: false,
    },
  ],

  async execute(data: Record<string, string>, _context: AgentContext): Promise<SkillResult> {
    const isUrgent = ['da', 'yes', 'nujno', '1'].includes(
      (data.urgency ?? '').toLowerCase().trim()
    )

    const craftworkers = await fetchMatchingCraftworkers(
      data.category.trim(),
      data.city.trim()
    )

    if (craftworkers.length === 0) {
      return {
        success: false,
        message:
          `Za kategorijo **${data.category}** v **${data.city}** trenutno ni razpoložljivih verificiranih mojstrov.\n\n` +
          'Povpraševanje je shranjeno — obvestili vas bomo, ko bo kdo na voljo.',
      }
    }

    // Score and rank
    const isWeekend = [0, 6].includes(new Date().getDay())
    const pricing = getPricingForCategory(data.category)
    const priceLabel = isUrgent
      ? `${pricing.withUrgentSurcharge.min}–${pricing.withUrgentSurcharge.max} EUR/uro`
      : isWeekend
      ? `${pricing.withWeekendSurcharge.min}–${pricing.withWeekendSurcharge.max} EUR/uro`
      : `${pricing.minHourly}–${pricing.maxHourly} EUR/uro`

    const ranked: RankedMatch[] = craftworkers
      .map((cw) => {
        const { score: pts, reasons } = score(cw, data.city, isUrgent)
        return {
          craftworkerId: cw.id,
          name: (cw.user as any)?.name ?? 'Neznan mojster',
          score: pts,
          reasons,
          estimatedPrice: priceLabel,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    const lines = ranked.map((m, i) => {
      const reasons = m.reasons.length ? m.reasons.join(', ') : 'Verificiran mojster'
      return `${i + 1}. **${m.name}** — ${m.score} točk\n   ${reasons}\n   💰 ${m.estimatedPrice}`
    })

    return {
      success: true,
      message: [
        `🏆 Top ${ranked.length} mojstri za **${data.category}** v **${data.city}**:`,
        '',
        ...lines,
        '',
        `💡 Cene so okvirne. Za nujno delo +15%, za vikend +25%.`,
      ].join('\n'),
      data: { matches: ranked },
    }
  },
}

skillRegistry.register(matchingCraftsmenSkill)

export { matchingCraftsmenSkill }
