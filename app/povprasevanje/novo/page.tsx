'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function NewInquiryAliasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(qs ? `/novo-povprasevanje?${qs}` : '/novo-povprasevanje')
  }, [router, searchParams])

  return null
}
