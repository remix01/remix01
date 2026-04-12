'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Home, BarChart3, FileText, Bell, User, LogOut, TrendingUp, Zap } from 'lucide-react'

interface PartnerBottomNavProps {
  paket?: {
    paket: 'start' | 'pro' | 'elite'
  }
}

export function PartnerBottomNav({ paket }: PartnerBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [resolvedPaket, setResolvedPaket] = useState<'start' | 'pro' | 'elite'>(paket?.paket ?? 'start')

  useEffect(() => {
    if (paket?.paket) {
      setResolvedPaket(paket.paket)
      return
    }

    const resolveSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: partner } = await supabase
        .from('obrtnik_profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle()

      if (partner?.subscription_tier === 'elite') setResolvedPaket('elite')
      else if (partner?.subscription_tier === 'pro') setResolvedPaket('pro')
      else setResolvedPaket('start')
    }

    resolveSubscription()
  }, [paket?.paket, supabase])

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

  const navLinks = [
    { href: '/partner-dashboard', icon: Home, label: 'Domov' },
    { href: '/partner-dashboard/povprasevanja', icon: FileText, label: 'Povpraševanja' },
    ...(resolvedPaket === 'pro' || resolvedPaket === 'elite' ? [
      { href: '/partner-dashboard/crm', icon: TrendingUp, label: 'CRM' },
      { href: '/partner-dashboard/insights', icon: BarChart3, label: 'Insights' },
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
