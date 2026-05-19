'use client'

import { useCallback, useState } from 'react'
import type { FlowState, GuidedFlow, FlowStep } from '@/lib/ai/guided-flows'
import {
  createFlowState,
  getCurrentStep,
  validateStepAnswer,
  advanceFlow,
  getFlowById,
  detectFlow,
} from '@/lib/ai/guided-flows'

export interface UseGuidedFlowReturn {
  active: boolean
  flow: GuidedFlow | null
  state: FlowState | null
  currentStep: FlowStep | null
  progress: number
  error: string | null
  startFlow: (flowId: string) => void
  tryDetectFlow: (message: string) => boolean
  submitStep: (answer: string | string[]) => void
  skipStep: () => void
  cancelFlow: () => void
  getPayload: () => Record<string, unknown> | null
}

export function useGuidedFlow(): UseGuidedFlowReturn {
  const [flow, setFlow] = useState<GuidedFlow | null>(null)
  const [state, setState] = useState<FlowState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentStep = flow && state ? getCurrentStep(flow, state) : null
  const progress = flow && state ? (state.currentStepIndex / flow.steps.length) * 100 : 0

  const startFlow = useCallback((flowId: string) => {
    const f = getFlowById(flowId)
    if (!f) return
    setFlow(f)
    setState(createFlowState(flowId))
    setError(null)
  }, [])

  const tryDetectFlow = useCallback((message: string): boolean => {
    const detected = detectFlow(message)
    if (detected) {
      setFlow(detected)
      setState(createFlowState(detected.id))
      setError(null)
      return true
    }
    return false
  }, [])

  const submitStep = useCallback((answer: string | string[]) => {
    if (!flow || !state || !currentStep) return
    const validationError = validateStepAnswer(currentStep, answer)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setState(advanceFlow(flow, state, currentStep.id, answer))
  }, [flow, state, currentStep])

  const skipStep = useCallback(() => {
    if (!flow || !state || !currentStep) return
    if (currentStep.required) {
      setError('To polje je obvezno.')
      return
    }
    setError(null)
    setState(advanceFlow(flow, state, currentStep.id, ''))
  }, [flow, state, currentStep])

  const cancelFlow = useCallback(() => {
    setFlow(null)
    setState(null)
    setError(null)
  }, [])

  const getPayload = useCallback((): Record<string, unknown> | null => {
    if (!flow || !state?.completed) return null
    return flow.buildPayload(state.answers)
  }, [flow, state])

  return {
    active: !!flow && !!state && !state.completed,
    flow,
    state,
    currentStep,
    progress,
    error,
    startFlow,
    tryDetectFlow,
    submitStep,
    skipStep,
    cancelFlow,
    getPayload,
  }
}
