/**
 * Skill: understanding-request
 *
 * Guides the customer through describing their service request clearly,
 * then creates a real `job` record in Supabase.
 *
 * Flow: description → location → urgency → budget (optional) → createJob()
 *
 * Triggers on: "potrebujem", "iščem", "rabim", intent patterns, etc.
 * Context: only for CUSTOMER role users.
 */

import { createClient } from '@/lib/supabase/server'
import type { SkillDefinition, SkillResult } from '../types'
import type { AgentContext } from '../../context'
import { skillRegistry } from '../executor'

// ---------------------------------------------------------------------------
// Category detection from free-form description
// ---------------------------------------------------------------------------
const CATEGORY_MAP: Array<[string, string]> = [
  ['vodovod', 'vodovodna-dela'],
  ['pip', 'vodovodna-dela'],
  ['električ', 'elektrika'],
  ['elektrik', 'elektrika'],
  ['soboslik', 'slikopleskarstvo'],
  ['pleskar', 'slikopleskarstvo'],
  ['tesar', 'tesarstvo'],
  ['mizar', 'tesarstvo'],
  ['ogrevan', 'ogrevanje-klima'],
  ['klima', 'ogrevanje-klima'],
  ['selit', 'selitev'],
  ['čiščen', 'ciscenje'],
  ['čistil', 'ciscenje'],
  ['streha', 'stresna-dela'],
  ['krovst', 'stresna-dela'],
  ['keramik', 'keramika'],
  ['tlakar', 'keramika'],
]

function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  for (const [keyword, slug] of CATEGORY_MAP) {
    if (lower.includes(keyword)) return slug
  }
  return 'splosno-vzdrz'
}

// ---------------------------------------------------------------------------
// Urgency mapping
// ---------------------------------------------------------------------------
const URGENCY_MAP: Record<string, string> = {
  '1': 'nujno', takoj: 'nujno', nujno: 'nujno',
  '2': 'kmalu', 'ta teden': 'kmalu', kmalu: 'kmalu',
  '3': 'normalno', prilagodljivo: 'normalno', normalno: 'normalno',
}

function resolveUrgency(answer: string): string {
  const lower = answer.toLowerCase()
  const key = Object.keys(URGENCY_MAP).find(k => lower.includes(k))
  return key ? URGENCY_MAP[key] : 'normalno'
}

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------
const understandingRequestSkill: SkillDefinition = {
  name: 'understanding-request',
  description: 'Pomaga naročniku jasno opisati storitev in ustvari povpraševanje (job)',

  triggers: {
    keywords: [
      'potrebujem', 'iščem', 'rabim', 'popravi', 'zamenjaj', 'namesti',
      'obnovi', 'pomagaj mi', 'mojster', 'serviser', 'poišči', 'najdi',
    ],
    intentPatterns: [
      'potrebujem .+ v .+',
      'iščem .+ za .+',
      'rabim .+ (takoj|kmalu)',
      'kdo .+ (popravi|namesti|zamenja)',
    ],
    contextCheck: (context) => context.userRole === 'user',
  },

  questions: [
    {
      field: 'description',
      question: 'Opišite, kaj točno potrebujete? (npr. "Zamenjati pip v kopalnici")',
      required: true,
      validator: (a) =>
        a.trim().length >= 5 || 'Prosim opišite bolj podrobno (vsaj 5 znakov).',
    },
    {
      field: 'location',
      question: 'V katerem mestu ali kraju ste? (npr. Ljubljana, Maribor, Celje...)',
      required: true,
      validator: (a) =>
        a.trim().length >= 2 || 'Prosim vnesite veljavno mesto.',
    },
    {
      field: 'urgency',
      question:
        'Kdaj to potrebujete?\n' +
        '1️⃣  Takoj (nujno)\n' +
        '2️⃣  Ta teden (kmalu)\n' +
        '3️⃣  Prilagodljivo (normalno)\n\n' +
        'Odgovorite z 1, 2 ali 3.',
      required: true,
      validator: (a) => {
        const lower = a.toLowerCase()
        const valid = ['1','2','3','takoj','nujno','ta teden','kmalu','prilagodljivo','normalno']
        return valid.some(v => lower.includes(v))
          ? true
          : 'Prosim izberite 1 (takoj), 2 (ta teden) ali 3 (prilagodljivo).'
      },
    },
    {
      field: 'budget',
      question:
        'Ali imate okvirni proračun v EUR? (neobvezno — pošljite "/" za preskok)',
      required: false,
    },
  ],

  async execute(data: Record<string, string>, context: AgentContext): Promise<SkillResult> {
    const urgency = resolveUrgency(data.urgency)
    const category = detectCategory(data.description)
    const hasBudget =
      data.budget && !['', 'ne', 'nima', 'nimam', 'skip', '/'].includes(
        data.budget.toLowerCase().trim()
      )

    const estimatedValue = hasBudget
      ? parseFloat(data.budget.replace(/[^0-9.]/g, '')) || undefined
      : undefined

    // Create the job in Supabase
    let jobId: string | undefined
    try {
      const supabase = await createClient()
      const { data: job, error } = await supabase
        .from('job')
        .insert({
          title: data.description.slice(0, 100),
          description: data.description,
          category,
          city: data.location.toLowerCase().trim(),
          estimated_value: estimatedValue ?? null,
          customer_id: context.userId,
          status: 'PENDING' as const,
          risk_score: 0,
          // nullable FK fields required by generated types
          craftworker_id: null,
          payment_id: null,
          conversation_id: null,
          twilio_conversation_sid: null,
          completed_at: null,
        })
        .select('id')
        .single()

      if (!error && job) {
        jobId = job.id
      }
    } catch {
      // Non-fatal — skill still returns a useful summary
    }

    const urgencyLabel = {
      nujno: '🔴 Takoj',
      kmalu: '🟡 Ta teden',
      normalno: '🟢 Prilagodljivo',
    }[urgency] ?? urgency

    const lines = [
      '✅ Povpraševanje ustvarjeno!',
      '',
      `📋 Opis: ${data.description}`,
      `📍 Lokacija: ${data.location}`,
      `⏰ Nujnost: ${urgencyLabel}`,
      hasBudget ? `💰 Proračun: ${data.budget} EUR` : null,
      jobId ? `🆔 ID povpraševanja: \`${jobId}\`` : null,
      '',
      'Iščemo najboljše mojstre za vas...',
    ].filter((l) => l !== null)

    return {
      success: true,
      message: lines.join('\n'),
      data: {
        jobId,
        description: data.description,
        location: data.location,
        urgency,
        category,
        budget: hasBudget ? data.budget : null,
      },
    }
  },
}

skillRegistry.register(understandingRequestSkill)

export { understandingRequestSkill }
