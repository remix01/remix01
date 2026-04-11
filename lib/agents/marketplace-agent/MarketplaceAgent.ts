import { BaseAgent } from '../base/BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from '../base/types'
import { matchObrtnikiForPovprasevanje, getAgentPricingEstimate } from '@/lib/agent/liftgo-agent'
import { tracer } from '@/lib/observability/tracing'

export class MarketplaceAgent extends BaseAgent {
  type: AgentType = 'marketplace'
  handledActions = ['matchMarketplaceRequest', 'estimateMarketplacePrice']

  async handle(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now()
    const span = this.trace(message.action)

    try {
      switch (message.action) {
        case 'matchMarketplaceRequest':
          return await this.matchMarketplaceRequest(message.payload, startTime)
        case 'estimateMarketplacePrice':
          return await this.estimateMarketplacePrice(message.payload, startTime)
        default:
          return {
            success: false,
            error: `Unknown action: ${message.action}`,
            handledBy: this.type,
            durationMs: Date.now() - startTime,
          }
      }
    } finally {
      tracer.endSpan(span)
    }
  }

  private async matchMarketplaceRequest(
    payload: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResponse> {
    const povprasevanjeId = String(payload.povprasevanjeId || payload.requestId || '')
    if (!povprasevanjeId) {
      return {
        success: false,
        error: 'povprasevanjeId is required',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    const result = await matchObrtnikiForPovprasevanje(povprasevanjeId)
    if (result.error) {
      return {
        success: false,
        error: result.error,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    return {
      success: true,
      data: {
        requestId: povprasevanjeId,
        matches: result.topMatches,
        reasoning: result.reasoning,
      },
      handledBy: this.type,
      durationMs: Date.now() - startTime,
    }
  }

  private async estimateMarketplacePrice(
    payload: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResponse> {
    const categorySlug = String(payload.categorySlug || 'default')
    const urgency = String(payload.urgency || 'normalno')
    const isWeekend = Boolean(payload.isWeekend ?? [0, 6].includes(new Date().getDay()))

    const estimate = await getAgentPricingEstimate({
      categorySlug,
      urgency,
      isWeekend,
    })

    return {
      success: true,
      data: estimate,
      handledBy: this.type,
      durationMs: Date.now() - startTime,
    }
  }
}
