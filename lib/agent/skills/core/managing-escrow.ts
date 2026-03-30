/**
 * Skill: managing-escrow
 *
 * Guides the customer through escrow payment actions:
 *   - Release payment (confirms work is complete)
 *   - Check current status from `escrow_transactions`
 *
 * A release returns a toolCall so the tool-router handles auth,
 * ownership verification, and state guards (via releaseEscrow.ts).
 *
 * Triggers on: "plačilo", "sprosti plačilo", "potrdi delo", intent patterns.
 * Context: only when an active escrow exists (context.activeResourceIds.escrowId).
 */

import { createClient } from '@/lib/supabase/server'
import type { SkillDefinition, SkillResult } from '../types'
import type { AgentContext } from '../../context'
import { skillRegistry } from '../executor'

// ---------------------------------------------------------------------------
// Escrow status fetch
// ---------------------------------------------------------------------------
async function fetchEscrowStatus(
  escrowId: string
): Promise<{ status: string; amountTotal: number } | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('escrow_transactions')
      .select('status, amount_total_cents')
      .eq('id', escrowId)
      .single()

    if (error || !data) return null
    return {
      status: data.status,
      amountTotal: Math.round(data.amount_total_cents / 100),
    }
  } catch {
    return null
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending:   '⏳ Čaka na plačilo',
  captured:  '🔒 Zavarovan (čaka na sprostitev)',
  paid:      '🔒 Plačan (čaka na sprostitev)',
  released:  '✅ Sproščen — izplačan mojstru',
  refunded:  '↩️ Vrnjen naročniku',
  disputed:  '⚠️ V sporu',
}

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------
const managingEscrowSkill: SkillDefinition = {
  name: 'managing-escrow',
  description: 'Pomaga pri sprostitvi ali preverjanju escrow plačil',

  triggers: {
    keywords: [
      'plačilo', 'escrow', 'sprosti plačilo', 'potrdi delo', 'potrdi zaključek',
      'vrni denar', 'refund', 'izplačilo mojstru', 'plačaj mojstru',
    ],
    intentPatterns: [
      'želim .+ plačil',
      'sprosti .+ denar',
      'potrdi .+ zaključen',
    ],
    contextCheck: (context) => !!context.activeResourceIds?.escrowId,
  },

  questions: [
    {
      field: 'escrowId',
      question:
        'Vnesite ID escrow transakcije\n(najdete ga v zavihku Plačila vašega profila):',
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
        return ['1', '2', 'sprosti', 'prever', 'status'].some(v => lower.includes(v))
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
          'Sistem bo preveril status in izvedel prenos na mojstrovi račun. ' +
          'Mojster bo samodejno obveščen.',
        toolCall: {
          tool: 'releaseEscrow',
          params: { escrowId: data.escrowId },
        },
      }
    }

    // Status check — fetch from DB
    const escrow = await fetchEscrowStatus(data.escrowId)

    if (!escrow) {
      return {
        success: false,
        message:
          `❌ Escrow transakcija \`${data.escrowId}\` ni bila najdena.\n\n` +
          'Preverite ID v zavihku Plačila.',
      }
    }

    const label = STATUS_LABELS[escrow.status] ?? `Status: ${escrow.status}`

    return {
      success: true,
      message: [
        `🔍 Status escrow \`${data.escrowId}\`:`,
        '',
        `${label}`,
        `💰 Znesek: ${escrow.amountTotal} EUR`,
        '',
        escrow.status === 'captured' || escrow.status === 'paid'
          ? '✅ Ko boste zadovoljni z delom, sprostitie plačilo z ukazom "sprosti plačilo".'
          : escrow.status === 'released'
          ? 'Plačilo je bilo že sproščeno.'
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
      data: { escrowId: data.escrowId, status: escrow.status, amount: escrow.amountTotal },
    }
  },
}

skillRegistry.register(managingEscrowSkill)

export { managingEscrowSkill }
