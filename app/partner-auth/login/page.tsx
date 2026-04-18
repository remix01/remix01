import { Suspense } from 'react'

import { PartnerLoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PartnerLoginForm />
    </Suspense>
  )
}
