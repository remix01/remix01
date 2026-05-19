import {
  GUIDED_FLOWS,
  detectFlow,
  createFlowState,
  getCurrentStep,
  validateStepAnswer,
  advanceFlow,
  getFlowById,
} from '@/lib/ai/guided-flows'

describe('Guided Flows', () => {
  it('detectFlow matches diagnosis keywords', () => {
    expect(detectFlow('Pipa ne deluje')?.id).toBe('device_diagnosis')
    expect(detectFlow('Imam napako na bojlerju')?.id).toBe('device_diagnosis')
  })

  it('detectFlow matches inquiry keywords', () => {
    expect(detectFlow('Novo povpraševanje za pleskanje')?.id).toBe('new_inquiry')
    expect(detectFlow('Iščem mojstra za streho')?.id).toBe('new_inquiry')
  })

  it('detectFlow matches quote keywords', () => {
    expect(detectFlow('Koliko stane zamenjava oken?')?.id).toBe('get_quote')
    expect(detectFlow('Kakšna je cena?')?.id).toBe('get_quote')
  })

  it('detectFlow returns null for unrelated messages', () => {
    expect(detectFlow('Lep pozdrav')).toBeNull()
    expect(detectFlow('Hvala za pomoč')).toBeNull()
  })

  it('createFlowState initializes correctly', () => {
    const state = createFlowState('device_diagnosis')
    expect(state.flowId).toBe('device_diagnosis')
    expect(state.currentStepIndex).toBe(0)
    expect(state.completed).toBe(false)
    expect(Object.keys(state.answers)).toHaveLength(0)
  })

  it('getCurrentStep returns first step initially', () => {
    const flow = getFlowById('device_diagnosis')!
    const state = createFlowState('device_diagnosis')
    const step = getCurrentStep(flow, state)
    expect(step?.id).toBe('category')
  })

  it('validateStepAnswer catches missing required field', () => {
    const flow = getFlowById('device_diagnosis')!
    const step = flow.steps[0]!
    expect(validateStepAnswer(step, '')).not.toBeNull()
  })

  it('validateStepAnswer catches too-short text', () => {
    const flow = getFlowById('device_diagnosis')!
    const descStep = flow.steps[1]!
    expect(validateStepAnswer(descStep, 'kratko')).not.toBeNull()
  })

  it('validateStepAnswer passes valid input', () => {
    const flow = getFlowById('device_diagnosis')!
    const descStep = flow.steps[1]!
    expect(validateStepAnswer(descStep, 'Iz pipe pod umivalnikom kaplja voda že tri dni.')).toBeNull()
  })

  it('advanceFlow progresses through steps', () => {
    const flow = getFlowById('device_diagnosis')!
    let state = createFlowState('device_diagnosis')

    state = advanceFlow(flow, state, 'category', 'vodovod')
    expect(state.currentStepIndex).toBe(1)
    expect(state.answers.category).toBe('vodovod')
    expect(state.completed).toBe(false)

    state = advanceFlow(flow, state, 'description', 'Dolg opis problema z vodovodom')
    expect(state.currentStepIndex).toBe(2)

    state = advanceFlow(flow, state, 'urgency', 'kmalu')
    expect(state.currentStepIndex).toBe(3)

    state = advanceFlow(flow, state, 'photo', '')
    expect(state.currentStepIndex).toBe(4)
    expect(state.completed).toBe(true)
  })

  it('buildPayload produces correct structure', () => {
    const flow = getFlowById('device_diagnosis')!
    const answers = {
      category: 'vodovod',
      description: 'Puščanje cevi v kopalnici',
      urgency: 'nujno',
      photo: '',
    }
    const payload = flow.buildPayload(answers)
    expect(payload.message).toContain('vodovod')
    expect(payload.message).toContain('Puščanje cevi')
    expect(payload.context).toEqual(expect.objectContaining({ guided_flow: 'device_diagnosis' }))
  })

  it('all flows have at least one trigger keyword', () => {
    for (const flow of GUIDED_FLOWS) {
      expect(flow.triggerKeywords.length).toBeGreaterThan(0)
    }
  })

  it('all flows have at least 2 steps', () => {
    for (const flow of GUIDED_FLOWS) {
      expect(flow.steps.length).toBeGreaterThanOrEqual(2)
    }
  })
})
