'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorStateProps {
  title: string
  description?: string
  errorMessage?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title,
  description,
  errorMessage,
  onRetry,
  retryLabel = 'Poskusi znova',
  className,
}: ErrorStateProps) {
  return (
    <div className={className ?? 'flex min-h-[600px] items-center justify-center'}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle>{title}</CardTitle>
          </div>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? <p className="text-sm text-muted-foreground">{errorMessage}</p> : null}
          {onRetry ? (
            <Button onClick={onRetry} className="w-full">
              {retryLabel}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

