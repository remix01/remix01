'use client'

import { CheckCircle2, Clock, AlertCircle, X } from 'lucide-react'

export interface TimelineEvent {
  step: string
  status: 'completed' | 'in_progress' | 'pending'
  date?: string
  icon?: string
}

interface JobTimelineProps {
  events: TimelineEvent[]
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
}

export function JobTimeline({ events }: JobTimelineProps) {
  if (!events || events.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = event.icon ? iconMap[event.icon] || CheckCircle2 : CheckCircle2
        const isLast = index === events.length - 1

        return (
          <div key={index} className="flex gap-4">
            {/* Timeline Dot and Line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  event.status === 'completed'
                    ? 'bg-green-50 border-green-600 text-green-600'
                    : event.status === 'in_progress'
                    ? 'bg-blue-50 border-blue-600 text-blue-600'
                    : 'bg-slate-50 border-slate-300 text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              {!isLast && (
                <div
                  className={`w-1 h-8 mt-1 ${
                    event.status === 'completed' ? 'bg-green-200' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1 pb-4">
              <h4 className="font-semibold text-slate-900">{event.step}</h4>
              {event.date && (
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(event.date).toLocaleDateString('sl-SI', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
