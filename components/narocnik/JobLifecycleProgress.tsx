import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface Step {
  label: string
  description: string
}

const STEPS: Step[] = [
  { label: 'Oddano', description: 'Povpraševanje je bilo oddano' },
  { label: 'Ponudbe', description: 'Mojstri pošiljajo ponudbe' },
  { label: 'Izbrano', description: 'Ponudba sprejeta' },
  { label: 'V teku', description: 'Delo poteka' },
  { label: 'Zaključeno', description: 'Delo opravljeno' },
]

interface Props {
  status: string
  ponudbeCount: number
  hasSprejeta: boolean
  isCancelled?: boolean
}

function getActiveStep(status: string, ponudbeCount: number, hasSprejeta: boolean): number {
  if (status === 'zakljuceno') return 5
  if (status === 'v_teku') return 4
  if (hasSprejeta) return 3
  if (ponudbeCount > 0) return 2
  return 1
}

export function JobLifecycleProgress({ status, ponudbeCount, hasSprejeta, isCancelled }: Props) {
  const activeStep = getActiveStep(status, ponudbeCount, hasSprejeta)

  if (isCancelled || status === 'preklicano') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        ✗ Povpraševanje je preklicano
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Potek dela
      </p>
      <ol className="relative">
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const done = stepNum < activeStep
          const current = stepNum === activeStep
          const upcoming = stepNum > activeStep
          const isLast = i === STEPS.length - 1

          return (
            <li key={step.label} className="flex gap-3">
              {/* Icon + connector */}
              <div className="flex flex-col items-center">
                <div className="flex-shrink-0">
                  {done ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  ) : current ? (
                    <Clock className="h-6 w-6 text-amber-500 animate-pulse" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`mt-1 w-0.5 flex-1 min-h-[20px] ${
                      done ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>

              {/* Text */}
              <div className="pb-5 pt-0.5">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    done
                      ? 'text-primary'
                      : current
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                  {current && (
                    <span className="ml-2 text-xs font-normal">← trenutno</span>
                  )}
                </p>
                {(done || current) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
