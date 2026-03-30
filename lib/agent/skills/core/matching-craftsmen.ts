/**
 * Skill: matching-craftsmen
 *
 * Finds and ranks the best obrtniki (craftsmen) for an existing povprasevanje.
 * Delegates to the existing AI-powered matchObrtnikiForPovprasevanje function.
 *
 * Triggers on: "najdi mojstr", "kateri mojster", "primerjaj ponudbe", etc.
 */

import type { SkillDefinition, SkillResult } from '../types'
import type { AgentContext } from '../../context'
import { matchObrtnikiForPovprasevanje } from '../../liftgo-agent'
import { skillRegistry } from '../executor'

const matchingCraftsmenSkill: SkillDefinition = {
  name: 'matching-craftsmen',
  description: 'Najde in rangira najboljše mojstre za obstoječe povpraševanje',

  triggers: {
    keywords: [
      'najdi mojstr', 'poišči mojstr', 'kateri mojster', 'primerjaj ponudbe',
      'primerjaj mojstr', 'kdo je najboljši', 'priporoči mojstr',
    ],
  },

  questions: [
    {
      field: 'povprasevanjeId',
      question:
        'Vnesite ID vašega povpraševanja (najdete ga na strani "Moja povpraševanja"):',
      required: true,
      validator: (a) => a.trim().length > 0 || 'ID povpraševanja je obvezen.',
    },
  ],

  async execute(data: Record<string, string>, _context: AgentContext): Promise<SkillResult> {
    const result = await matchObrtnikiForPovprasevanje(data.povprasevanjeId)

    if (result.error || result.topMatches.length === 0) {
      return {
        success: false,
        message:
          result.error ??
          'Za vaše povpraševanje trenutno ni razpoložljivih mojstrov. Poskusite pozneje.',
      }
    }

    const lines = result.topMatches.map((m, i) => {
      const reasons = m.reasons.join(', ')
      const price = m.estimatedPrice ? `\n   💰 ${m.estimatedPrice}` : ''
      return `${i + 1}. **${m.businessName}** — ${m.score}/100\n   ${reasons}${price}`
    })

    return {
      success: true,
      message: [
        `🏆 Top ${result.topMatches.length} mojstri za vas:`,
        '',
        ...lines,
        '',
        result.reasoning,
      ].join('\n'),
      data: { matches: result.topMatches },
    }
  },
}

skillRegistry.register(matchingCraftsmenSkill)

export { matchingCraftsmenSkill }
