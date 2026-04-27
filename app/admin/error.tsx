'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/dashboard/ErrorState'

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
    <ErrorState
      title="Prišlo je do napake"
      description="Pri nalaganju te strani je prišlo do napake."
      errorMessage={error.message}
      onRetry={reset}
    />
  )
}
