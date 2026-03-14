'use client'

import { Suspense } from 'react'
import { PartnerLoginContent } from './partner-login-form'

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Nalaganje...</div>}>
      <PartnerLoginContent />
    </Suspense>
  )
}



