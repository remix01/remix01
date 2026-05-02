'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProtectedNavLinkProps {
  href: string
  className?: string
  children: React.ReactNode
}

export function ProtectedNavLink({ href, className, children }: ProtectedNavLinkProps) {
  const router = useRouter()

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      router.push(user ? href : '/partner-auth/login')
    } catch {
      router.push('/partner-auth/login')
    }
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
