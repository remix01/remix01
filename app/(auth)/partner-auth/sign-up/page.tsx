'use client'

import { Suspense } from 'react'
import { PartnerSignUpForm } from './partner-signup-form'

export default function PartnerSignUpPage() {
  return (
    <Suspense fallback={<div className="space-y-6 animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>}>
      <PartnerSignUpForm />
    </Suspense>
  )
}
