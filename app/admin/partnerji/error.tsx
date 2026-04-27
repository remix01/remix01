'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/dashboard/ErrorState'

export default function PartnerjiError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Partnerji Error]', error)
  }, [error])

  return (
    <ErrorState
      title="Napaka pri nalaganju partnerjev"
      description="Pri nalaganju seznama partnerjev je prišlo do napake."
      errorMessage={error.message}
      onRetry={reset}
    />
  )
}
