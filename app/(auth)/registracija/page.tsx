'use client'

import { Suspense } from 'react'
import { RegistracijaForm } from './registracija-form'

export default function RegistracijaPage() {
  return (
    <Suspense fallback={<div className="space-y-6 animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>}>
      <RegistracijaForm />
    </Suspense>
  )
}

