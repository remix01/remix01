import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="p-12 text-center">
        {icon ? <div className="mb-4 text-5xl">{icon}</div> : null}
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        {description ? <p className="mx-auto mb-6 max-w-sm text-muted-foreground">{description}</p> : null}
        {action}
      </CardContent>
    </Card>
  )
}

