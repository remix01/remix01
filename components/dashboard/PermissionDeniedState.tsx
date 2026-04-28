'use client'

import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PermissionDeniedStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  action?: ReactNode
  className?: string
}

export function PermissionDeniedState({
  title = 'Dostop zavrnjen',
  description = 'Nimate dovoljenja za dostop do te vsebine.',
  actionLabel,
  onAction,
  action,
  className,
}: PermissionDeniedStateProps) {
  return (
    <div className={className ?? 'flex min-h-[320px] items-center justify-center'}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {(action || (actionLabel && onAction)) ? (
          <CardContent>
            {action ?? (
              <Button onClick={onAction} className="w-full">
                {actionLabel}
              </Button>
            )}
          </CardContent>
        ) : null}
      </Card>
    </div>
  )
}

