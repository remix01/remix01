/**
 * Skill: managing-escrow
 *
 * Guides the user through escrow payment actions:
 *   - Release payment (work confirmed complete)
 *   - Check status
 *
 * Returns a toolCall for releaseEscrow which the orchestrator then routes
 * through the tool-router with full guardrails and permission checks.
 *
 * Triggers on: "plačilo", "sprosti plačilo", "potrdi delo", etc.
 */

import type { SkillDefinition, SkillResult } from '../types'
import type { AgentContext } from '../../context'
import { skillRegistry } from '../executor'

const managingEscrowSkill: SkillDefinition = {
  name: 'managing-escrow',
  description: 'Pomaga pri upravljanju escrow plačil — sprostitev ali preverjanje statusa',

  triggers: {
    keywords: [
      'plačilo', 'escrow', 'sprosti plačilo', 'potrdi delo', 'potrdi zaključek',
      'vrni denar', 'refund', 'izplačilo mojstru', 'plačaj mojstru',
    ],
  },

  questions: [
    {
      field: 'escrowId',
      question:
        'Vnesite ID escrow transakcije (najdete ga v detajlih povpraševanja):',
      required: true,
      validator: (a) => a.trim().length > 0 || 'ID transakcije je obvezen.',
    },
    {
      field: 'action',
      question:
        'Kaj želite narediti?\n' +
        '1️⃣  Sprostiti plačilo (delo je zaključeno in ste zadovoljni)\n' +
        '2️⃣  Preveriti status plačila\n\n' +
        'Odgovorite z 1 ali 2.',
      required: true,
      validator: (a) => {
        const lower = a.toLowerCase()
        return ['1', '2', 'sprosti', 'prever'].some(v => lower.includes(v))
          ? true
          : 'Prosim odgovorite z 1 (sprostitev) ali 2 (status).'
      },
    },
  ],

  async execute(data: Record<string, string>, _context: AgentContext): Promise<SkillResult> {
    const isRelease =
      data.action === '1' ||
      data.action.toLowerCase().includes('sprosti') ||
      data.action.toLowerCase().includes('zaključ')

    if (isRelease) {
      return {
        success: true,
        message:
          `💸 Sproščam plačilo za escrow \`${data.escrowId}\`...\n\n` +
          'Sistem bo preveril stanje in izvedel prenos. Mojster bo obveščen.',
        toolCall: {
          tool: 'releaseEscrow',
          params: { escrowId: data.escrowId },
        },
      }
    }

    // Status check — no tool call needed, just inform
    return {
      success: true,
      message:
        `🔍 Preverite status escrow \`${data.escrowId}\` v zavihku **Plačila** vašega profila.\n\n` +
        'Statusi: `pending` → `captured` → `released` ali `refunded`.',
      data: { escrowId: data.escrowId, requestedAction: 'status' },
    }
  },
}

skillRegistry.register(managingEscrowSkill)

export { managingEscrowSkill }
