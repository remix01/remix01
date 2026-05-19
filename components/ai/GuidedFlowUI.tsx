'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FlowStep, GuidedFlow, FlowState } from '@/lib/ai/guided-flows'

interface GuidedFlowUIProps {
  flow: GuidedFlow
  state: FlowState
  currentStep: FlowStep | null
  progress: number
  error: string | null
  lang: 'sl' | 'en'
  onSubmitStep: (answer: string | string[]) => void
  onSkip: () => void
  onCancel: () => void
}

export function GuidedFlowUI({
  flow,
  state,
  currentStep,
  progress,
  error,
  lang,
  onSubmitStep,
  onSkip,
  onCancel,
}: GuidedFlowUIProps) {
  const [inputValue, setInputValue] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  if (!currentStep) return null

  const question = lang === 'en' && currentStep.questionEn ? currentStep.questionEn : currentStep.question
  const placeholder = lang === 'en' && currentStep.placeholderEn ? currentStep.placeholderEn : currentStep.placeholder
  const flowName = lang === 'en' && flow.nameEn ? flow.nameEn : flow.name

  const handleSubmit = () => {
    if (currentStep.inputType === 'select') {
      onSubmitStep(selectedOptions[0] ?? '')
    } else if (currentStep.inputType === 'multiselect') {
      onSubmitStep(selectedOptions)
    } else {
      onSubmitStep(inputValue)
    }
    setInputValue('')
    setSelectedOptions([])
  }

  const handleOptionClick = (value: string) => {
    if (currentStep.inputType === 'multiselect') {
      setSelectedOptions(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      )
    } else {
      setSelectedOptions([value])
      onSubmitStep(value)
      setInputValue('')
      setSelectedOptions([])
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-blue-700">{flowName}</span>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {lang === 'en' ? 'Cancel' : 'Prekliči'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step counter */}
      <span className="text-xs text-gray-500">
        {lang === 'en' ? 'Step' : 'Korak'} {state.currentStepIndex + 1} / {flow.steps.length}
      </span>

      {/* Question */}
      <p className="text-sm font-medium text-gray-800">{question}</p>

      {/* Input area */}
      {currentStep.inputType === 'text' && (
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-md border border-gray-200 bg-white p-2 text-sm focus:border-blue-400 focus:outline-none"
        />
      )}

      {(currentStep.inputType === 'select' || currentStep.inputType === 'multiselect') && currentStep.options && (
        <div className="flex flex-wrap gap-2">
          {currentStep.options.map((opt) => {
            const label = lang === 'en' && opt.labelEn ? opt.labelEn : opt.label
            const isSelected = selectedOptions.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => handleOptionClick(opt.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs transition-colors',
                  isSelected
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {currentStep.inputType === 'image' && (
        <div className="text-xs text-gray-500">
          {lang === 'en'
            ? 'Use the attachment button below to upload a photo.'
            : 'Uporabite gumb za prilogo spodaj, da naložite fotografijo.'}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        {currentStep.inputType !== 'select' && (
          <Button size="sm" onClick={handleSubmit} className="text-xs">
            {lang === 'en' ? 'Next' : 'Naprej'}
          </Button>
        )}
        {currentStep.inputType === 'multiselect' && (
          <Button size="sm" onClick={handleSubmit} className="text-xs">
            {lang === 'en' ? 'Next' : 'Naprej'}
          </Button>
        )}
        {!currentStep.required && (
          <Button size="sm" variant="ghost" onClick={onSkip} className="text-xs text-gray-500">
            {lang === 'en' ? 'Skip' : 'Preskoči'}
          </Button>
        )}
      </div>
    </div>
  )
}
