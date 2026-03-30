/**
 * Skill: understanding-request
 *
 * Guides the user through describing their service request clearly.
 * Collects: location, urgency, optional budget — then summarises for handoff.
 *
 * Triggers on: "potrebujem", "iščem", "mojster", "popravi", etc.
 */

import type { SkillDefinition, SkillResult } from '../types'
import type { AgentContext } from '../../context'
import { skillRegistry } from '../executor'

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

const understandingRequestSkill: SkillDefinition = {
  name: 'understanding-request',
  description: 'Pomaga naročniku jasno opisati storitev, ki jo potrebuje',

  triggers: {
    keywords: [
      'potrebujem', 'iščem', 'popravi', 'zamenjaj', 'namesti', 'obnovi',
      'pomagaj mi', 'kdo mi', 'mojster', 'serviser', 'poišči', 'najdi',
    ],
  },

  questions: [
    {
      field: 'description',
      question: 'Opišite, kaj točno potrebujete? (npr. "Zamenjati pip v kopalnici")',
      required: true,
      validator: (a) => a.trim().length >= 5 || 'Prosim opišite bolj podrobno (vsaj 5 znakov).',
    },
    {
      field: 'location',
      question: 'V katerem mestu ali kraju ste? (npr. Ljubljana, Maribor, Celje...)',
      required: true,
      validator: (a) => a.trim().length >= 2 || 'Prosim vnesite veljavno mesto.',
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
        const valid = ['1', '2', '3', 'takoj', 'nujno', 'ta teden', 'kmalu', 'prilagodljivo', 'normalno']
        return valid.some(v => lower.includes(v))
          ? true
          : 'Prosim izberite 1 (takoj), 2 (ta teden) ali 3 (prilagodljivo).'
      },
    },
    {
      field: 'budget',
      question: 'Ali imate okvirni proračun v EUR? (neobvezno — pritisnite Enter za preskok)',
      required: false,
    },
  ],

  async execute(data: Record<string, string>, _context: AgentContext): Promise<SkillResult> {
    const urgency = resolveUrgency(data.urgency)
    const hasBudget =
      data.budget &&
      !['', 'ne', 'nima', 'nimam', 'skip', '/'].includes(data.budget.toLowerCase().trim())

    const urgencyLabel = { nujno: '🔴 Takoj', kmalu: '🟡 Ta teden', normalno: '🟢 Prilagodljivo' }[urgency]

    const summary = [
      '✅ Razumel sem vašo zahtevo!',
      '',
      `📋 Opis: ${data.description}`,
      `📍 Lokacija: ${data.location}`,
      `⏰ Nujnost: ${urgencyLabel}`,
      hasBudget ? `💰 Proračun: ${data.budget} EUR` : null,
      '',
      'Iščemo najboljše mojstre za vas...',
    ]
      .filter((l) => l !== null)
      .join('\n')

    return {
      success: true,
      message: summary,
      data: {
        description: data.description,
        location: data.location,
        urgency,
        budget: hasBudget ? data.budget : null,
      },
    }
  },
}

skillRegistry.register(understandingRequestSkill)

export { understandingRequestSkill }
