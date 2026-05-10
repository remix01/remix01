import { getAICapabilityStatus, hasMinimumAIStackReady } from '@/lib/ai/capabilities'

describe('AI capability status', () => {
  it('reports core stack as implemented', () => {
    const status = getAICapabilityStatus()

    expect(status.langchain.implemented).toBe(true)
    expect(status.langgraph.implemented).toBe(true)
    expect(status.deepAgents.implemented).toBe(true)
    expect(status.integrations.implemented).toBe(true)
    expect(typeof status.langsmith.detail).toBe('string')
  })

  it('minimum stack readiness is true', () => {
    expect(hasMinimumAIStackReady()).toBe(true)
  })
})
