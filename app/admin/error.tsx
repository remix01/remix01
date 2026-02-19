'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Admin Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[600px] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle>Prišlo je do napake</CardTitle>
          </div>
          <CardDescription>Pri nalaganju te strani je prišlo do napake.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={reset} className="w-full">
            Poskusi znova
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
