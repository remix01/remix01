'use client'

import { useState, type ComponentType } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  LogOut,
  BarChart3,
  FileText,
  Home,
  User,
  TrendingUp,
  Zap,
  Bell,
  MessageCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

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
  icon: ComponentType<{ className?: string }>
  label: string
}

export function PartnerSidebar({ partner }: PartnerSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isProOrElite = partner.subscription_tier === 'pro' || partner.subscription_tier === 'elite'

  const navItems: PartnerNavItem[] = [
    { href: '/partner-dashboard', icon: Home, label: 'Domov' },
    { href: '/partner-dashboard/povprasevanja', icon: FileText, label: 'Povpraševanja' },
    { href: '/partner-dashboard/sporocila', icon: MessageCircle, label: 'Sporočila' },
    { href: '/partner-dashboard?tab=offers', icon: FileText, label: 'Moje ponudbe' },
    ...(isProOrElite
      ? [
          { href: '/partner-dashboard/crm', icon: TrendingUp, label: 'CRM' },
          { href: '/partner-dashboard/insights', icon: BarChart3, label: 'Insights' },
          { href: '/partner-dashboard/offers/generate', icon: Zap, label: 'Generator ponudb' },
        ]
      : []),
    { href: '/partner-dashboard/notifications', icon: Bell, label: 'Obvestila' },
    { href: '/partner-dashboard/account/narocnina', icon: CreditCard, label: 'Naročnina' },
    { href: '/partner-dashboard/account', icon: User, label: 'Račun' },
  ]

  const isActive = (href: string) => {
    const normalizedHref = href.split('?')[0]
    if (href.includes('?tab=offers')) return pathname === '/partner-dashboard'
    return pathname === normalizedHref || pathname?.startsWith(normalizedHref + '/')
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      const { error } = await supabase.auth.signOut()
      if (error) console.error('Logout error:', error)
      router.replace('/partner-auth/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="sticky top-0 z-30 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <Link href="/partner-dashboard" className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">L</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{partner.business_name || 'Moj portal'}</p>
              <p className="text-xs text-muted-foreground">
                {partner.subscription_tier === 'elite'
                  ? 'ELITE'
                  : partner.subscription_tier === 'pro'
                    ? 'PRO'
                    : 'START'}
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium text-destructive disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isLoading ? 'Odjavljam...' : 'Odjava'}
          </button>
        </div>
      </div>

      <aside className={`hidden border-r bg-muted/50 p-4 transition-all lg:flex lg:flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link href="/partner-dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            {!isCollapsed && <span className="font-display text-xl font-bold text-foreground">LiftGO</span>}
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground"
            aria-label={isCollapsed ? 'Razširi meni' : 'Skrči meni'}
            title={isCollapsed ? 'Razširi meni' : 'Skrči meni'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {!isCollapsed && (
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
        )}

        <nav className="mb-8 flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-background'
              } ${isCollapsed ? 'justify-center' : 'gap-3'}`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4" />
              {!isCollapsed && item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t pt-6">
          {!isCollapsed && (
            <div className="mb-4 rounded-lg bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground">PODJETJE</p>
              <p className="font-semibold text-foreground">{partner.business_name}</p>
              <p className="text-xs text-muted-foreground">{partner.avg_rating.toFixed(1)} ⭐</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 ${isCollapsed ? 'justify-center' : 'gap-3'}`}
            title={isCollapsed ? 'Odjava' : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && (isLoading ? 'Odjavljam...' : 'Odjava')}
          </button>
        </div>
      </aside>
    </>
  )
}
