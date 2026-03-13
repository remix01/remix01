'use client'

import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface JobStatusTimelineProps {
  status: 'poslana' | 'v_teku' | 'zakljuceno' | 'zavrnjeno'
  ponudbeCount: number
  acceptedAt?: string
  createdAt: string
}

export function JobStatusTimeline({
  status,
  ponudbeCount,
  acceptedAt,
  createdAt,
}: JobStatusTimelineProps) {
  const steps = [
    {
      id: 1,
      label: 'Povpraševanje oddano',
      timestamp: createdAt,
      status: 'done' as const,
      sublabel: new Date(createdAt).toLocaleDateString('sl-SI'),
    },
    {
      id: 2,
      label: 'Ponudbe prejete',
      timestamp: null,
      status: ponudbeCount > 0 ? ('done' as const) : ('waiting' as const),
      sublabel: ponudbeCount > 0 ? `${ponudbeCount} obrtnikov odgovorilo` : 'Čakamo na odgovore...',
    },
    {
      id: 3,
      label: 'Ponudba sprejeta',
      timestamp: acceptedAt,
      status:
        status === 'v_teku' || status === 'zakljuceno' ? ('done' as const) : ('waiting' as const),
      sublabel:
        status === 'v_teku' || status === 'zakljuceno'
          ? acceptedAt
            ? new Date(acceptedAt).toLocaleDateString('sl-SI')
            : 'V teku'
          : 'Čakamo na izbor',
    },
    {
      id: 4,
      label: 'Delo v teku',
      timestamp: null,
      status: status === 'v_teku' ? ('active' as const) : status === 'zakljuceno' ? ('done' as const) : ('waiting' as const),
      sublabel: status === 'v_tiku' ? 'Obrtnik dela' : status === 'zakljuceno' ? 'Opravljeno' : 'Čakamo na obrtnika',
    },
    {
      id: 5,
      label: 'Opravljeno',
      timestamp: null,
      status: status === 'zakljuceno' ? ('done' as const) : ('waiting' as const),
      sublabel: status === 'zakljuceno' ? '✓' : 'Čakamo na zaključek',
    },
  ]

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        const iconColor =
          step.status === 'done'
            ? 'text-green-600'
            : step.status === 'active'
              ? 'text-blue-600'
              : 'text-gray-300'
        const bgColor =
          step.status === 'done'
            ? 'bg-green-50'
            : step.status === 'active'
              ? 'bg-blue-50'
              : 'bg-gray-50'

        return (
          <div key={step.id} className="flex gap-4">
            {/* Timeline dot and line */}
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-1.5 ${bgColor}`}>
                {step.status === 'done' && <CheckCircle className={`w-6 h-6 ${iconColor}`} />}
                {step.status === 'active' && (
                  <Clock className={`w-6 h-6 ${iconColor} animate-pulse`} />
                )}
                {step.status === 'waiting' && <AlertCircle className={`w-6 h-6 ${iconColor}`} />}
              </div>
              {!isLast && (
                <div
                  className={`w-1 h-12 mt-2 ${step.status === 'done' ? 'bg-green-200' : 'bg-gray-200'}`}
                />
              )}
            </div>

            {/* Timeline content */}
            <div className="pb-4">
              <p className="font-medium text-slate-900">{step.label}</p>
              <p className="text-sm text-slate-600">{step.sublabel}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
