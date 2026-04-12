'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Home, BarChart3, FileText, Bell, User, LogOut, TrendingUp, Zap } from 'lucide-react'

type PlanTier = 'start' | 'pro' | 'elite'

interface PartnerBottomNavProps {
  /** Optional: pass the tier if already known (avoids an extra Supabase call). */
  paket?: { paket: PlanTier }
}

/**
 * Mobile-only fixed bottom navigation for the partner dashboard.
 *
 * When `paket` prop is omitted the component fetches the partner's
 * subscription tier from Supabase on mount, so sub-pages don't need
 * to prop-drill the plan down just for this nav.
 */
export function PartnerBottomNav({ paket }: PartnerBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Initialise from prop if provided; otherwise start with 'start' and fetch.
  const [tier, setTier] = useState<PlanTier>(paket?.paket ?? 'start')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // If the caller already told us the tier, skip the fetch.
    if (paket?.paket) {
      setTier(paket.paket)
      return
    }

    // Self-fetch subscription tier so every page gets correct nav links.
    const fetchTier = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('obrtnik_profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.subscription_tier) {
        setTier(data.subscription_tier as PlanTier)
      }
    }

    fetchTier()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paket?.paket])

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isPro = tier === 'pro' || tier === 'elite'

  const navLinks = [
    { href: '/partner-dashboard', icon: Home, label: 'Domov' },
    { href: '/partner-dashboard/povprasevanja', icon: FileText, label: 'Povpraševanja' },
    ...(isPro ? [
      { href: '/partner-dashboard/crm', icon: TrendingUp, label: 'CRM' },
      { href: '/partner-dashboard/offers/generate', icon: Zap, label: 'Generator' },
    ] : []),
    { href: '/partner-dashboard/notifications', icon: Bell, label: 'Obvestila' },
    { href: '/partner-dashboard/account', icon: User, label: 'Račun' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background flex justify-around items-center h-20 px-2 gap-1">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 ${
            isActive(link.href)
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <link.icon className="h-5 w-5" />
          <span className="text-xs font-medium">{link.label}</span>
        </Link>
      ))}
    </div>
  )
}
