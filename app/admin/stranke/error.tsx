'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/dashboard/ErrorState'

export default function StrankeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Stranke Error]', error)
  }, [error])

  return (
    <ErrorState
      title="Napaka pri nalaganju strank"
      description="Pri nalaganju seznama strank je prišlo do napake."
      errorMessage={error.message}
      onRetry={reset}
    />
  )
}
