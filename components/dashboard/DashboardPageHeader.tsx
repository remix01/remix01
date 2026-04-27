import type { ReactNode } from 'react'

interface DashboardPageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function DashboardPageHeader({
  title,
  subtitle,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div className={className ?? 'flex items-center justify-between'}>
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  )
}

