import { Suspense } from 'react'

import { PartnerLoginForm } from './login-form'

export const dynamic = 'force-dynamic'

// TODO: odstraniti legacy partner-auth po preverbi referenc
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PartnerLoginForm />
    </Suspense>
  )
}
