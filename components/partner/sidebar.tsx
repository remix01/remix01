'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { LogOut, BarChart3, FileText, Home, User, TrendingUp, Zap, Bell } from 'lucide-react'

interface PartnerSidebarProps {
  partner: {
    business_name: string
    subscription_tier: 'start' | 'pro' | 'elite'
    avg_rating: number
    is_verified: boolean
  }
}

interface PartnerNavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

export function PartnerSidebar({ partner }: PartnerSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)

  const isProOrElite = partner.subscription_tier === 'pro' || partner.subscription_tier === 'elite'

  const navItems: PartnerNavItem[] = [
    { href: '/partner-dashboard', icon: Home, label: 'Domov' },
    { href: '/partner-dashboard/povprasevanja', icon: FileText, label: 'Povpraševanja' },
    ...(isProOrElite
      ? [
          { href: '/partner-dashboard/crm', icon: TrendingUp, label: 'CRM' },
          { href: '/partner-dashboard/insights', icon: BarChart3, label: 'Insights' },
          { href: '/partner-dashboard/offers/generate', icon: Zap, label: 'Generator ponudb' },
        ]
      : []),
    { href: '/partner-dashboard/notifications', icon: Bell, label: 'Obvestila' },
    { href: '/partner-dashboard/account', icon: User, label: 'Račun' },
  ]

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        return
      }
      router.replace('/partner-auth/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <aside className="hidden w-64 border-r bg-muted/50 p-6 lg:flex flex-col">
      <div className="mb-8">
        <Link href="/partner-dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">L</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">LiftGO</span>
        </Link>
      </div>

      <div className="mb-8 rounded-lg border bg-background p-4">
        <p className="text-sm font-semibold text-foreground">{partner.business_name}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {partner.is_verified && '✓'} {partner.avg_rating.toFixed(1)} ⭐
        </p>
        <p className="mt-2 text-xs font-medium text-primary">
          {partner.subscription_tier === 'elite'
            ? 'ELITE plan'
            : partner.subscription_tier === 'pro'
              ? 'PRO plan'
              : 'START plan'}
        </p>
      </div>

      <nav className="mb-8 flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-background'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t pt-6">
        <div className="mb-4 rounded-lg bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground">PODJETJE</p>
          <p className="font-semibold text-foreground">{partner.business_name}</p>
          <p className="text-xs text-muted-foreground">{partner.avg_rating.toFixed(1)} ⭐</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoading}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {isLoading ? 'Odjavljam...' : 'Odjava'}
        </button>
      </div>
    </aside>
  )
}
