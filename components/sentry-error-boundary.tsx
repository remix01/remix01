'use client'

import * as Sentry from '@sentry/nextjs'
import { ReactNode } from 'react'

interface SentryErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: unknown, reset: () => void) => ReactNode
}

export function SentryErrorBoundary({ 
  children, 
  fallback 
}: SentryErrorBoundaryProps) {
  const SentryErrorBoundary = Sentry.ErrorBoundary
  
  return (
    <SentryErrorBoundary 
      fallback={({ error, resetError }) => (
        <>
          {fallback ? (
            fallback(error, resetError)
          ) : (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
              <h1 className="text-3xl font-bold text-destructive mb-4">
                Napaka pri učitavanju strani
              </h1>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Pride do napake. Naš tim je bil obveščen in bo problem razrešil čim prej.
              </p>
              <button
                onClick={resetError}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
              >
                Poskusite znova
              </button>
            </div>
          )}
        </>
      )}
      showDialog
    >
      {children}
    </SentryErrorBoundary>
  )
}
