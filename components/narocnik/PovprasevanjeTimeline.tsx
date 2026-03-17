'use client'

interface Props {
  status: 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano'
  createdAt?: string
}

const STEPS = [
  { key: 'oddano',   label: 'Oddano' },
  { key: 'ponudbe',  label: 'Ponudbe prejete' },
  { key: 'sprejeto', label: 'Ponudba sprejeta' },
  { key: 'v_teku',   label: 'Delo v teku' },
  { key: 'zakljuceno', label: 'Zaključeno' },
]

function getActiveStep(status: Props['status']): number {
  if (status === 'preklicano') return -1
  if (status === 'odprto')     return 0
  if (status === 'v_teku')     return 2
  if (status === 'zakljuceno') return 4
  return 1
}

export function PovprasevanjeTimeline({ status, createdAt }: Props) {
  if (status === 'preklicano') {
    return (
      <div className="flex items-center gap-2 py-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 border border-red-200">
          Preklicano
        </span>
        {createdAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleDateString('sl-SI')}
          </span>
        )}
      </div>
    )
  }

  const activeStep = getActiveStep(status)

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* connecting line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, idx) => {
          const isDone    = idx <= activeStep
          const isCurrent = idx === activeStep
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all text-xs font-bold
                  ${isDone
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-border text-muted-foreground'
                  }
                  ${isCurrent ? 'ring-2 ring-primary/30 ring-offset-1' : ''}
                `}
              >
                {isDone && idx < activeStep ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className={`text-xs text-center leading-tight max-w-[70px] hidden sm:block
                ${isDone ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
      {/* Mobile: show current step label */}
      <p className="text-xs text-center text-muted-foreground mt-3 sm:hidden">
        Korak {activeStep + 1} / {STEPS.length}: <span className="font-medium text-foreground">{STEPS[activeStep]?.label}</span>
      </p>
    </div>
  )
}
