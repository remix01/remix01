import { Badge } from '@/components/ui/badge'
import { Briefcase, AlertTriangle, Ban } from 'lucide-react'

interface ActivityTimelineProps {
  jobs: any[]
  violations: any[]
}

export function ActivityTimeline({ jobs, violations }: ActivityTimelineProps) {
  const events = [
    ...jobs.map(j => ({ type: 'job', date: j.createdAt, data: j })),
    ...violations.map(v => ({ type: 'violation', date: v.createdAt, data: v })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Aktivnost timeline</h3>
      <div className="space-y-4">
        {events.slice(0, 10).map((event, i) => (
          <div key={i} className="flex gap-3 pb-4 border-b last:border-0">
            {event.type === 'job' ? (
              <>
                <div className="mt-0.5">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{event.data.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('sl-SI')}
                  </div>
                </div>
                <Badge variant="secondary">{event.data.status}</Badge>
              </>
            ) : (
              <>
                <div className="mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Kršitev: {event.data.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('sl-SI')}
                  </div>
                </div>
                <Badge variant="destructive">{event.data.severity}</Badge>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
