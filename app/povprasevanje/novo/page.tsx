'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function Redirector() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(qs ? `/novo-povprasevanje?${qs}` : '/novo-povprasevanje')
  }, [router, searchParams])

  return null
}

export default function NewInquiryAliasPage() {
  return (
    <Suspense>
      <Redirector />
    </Suspense>
  )
}
