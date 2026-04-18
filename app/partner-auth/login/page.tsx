import { Suspense } from 'react'
import { PartnerLoginForm } from './partner-login-form'

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">Nalagam prijavo...</div>}>
      <PartnerLoginForm />
    </Suspense>
  )
}
