'use client'

import { useState, type ComponentType } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { LogOut, BarChart3, FileText, Home, User, TrendingUp, Zap, Bell, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

interface PartnerSidebarProps {
  partner: {
    business_name?: string | null
    subscription_tier?: 'start' | 'pro' | 'elite' | null
    avg_rating?: number | null
    is_verified?: boolean | null
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

  const normalizedTier = partner.subscription_tier ?? 'start'
  const isProOrElite = normalizedTier === 'pro' || normalizedTier === 'elite'
  const partnerName = partner.business_name || 'Moj portal'
  const partnerRating = typeof partner.avg_rating === 'number' ? partner.avg_rating.toFixed(1) : '0.0'
  const partnerVerified = Boolean(partner.is_verified)

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
              <p className="truncate text-sm font-semibold text-foreground">{partnerName}</p>
              <p className="text-xs text-muted-foreground">
                {normalizedTier === 'elite'
                  ? 'ELITE'
                  : normalizedTier === 'pro'
                    ? 'PRO'
                    : 'START'}
              </p>
            </div>
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium"
                aria-label="Odpri navigacijo"
              >
                <Menu className="h-4 w-4" />
                Meni
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
              <div className="flex h-full flex-col">
                <div className="border-b p-5">
                  <p className="text-base font-semibold">{partnerName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {partnerVerified ? '✓ Verificiran' : 'Neverificiran'} · {partnerRating} ⭐
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary uppercase">{normalizedTier} plan</p>
                </div>

                <nav className="flex-1 space-y-1 p-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="border-t p-4">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoading ? 'Odjavljam...' : 'Odjava'}
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <aside className="hidden w-64 border-r bg-muted/50 p-6 lg:flex lg:flex-col">
        <div className="mb-8">
          <Link href="/partner-dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">LiftGO</span>
          </Link>
        </div>

        <div className="mb-8 rounded-lg border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">{partnerName}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {partnerVerified && '✓'} {partnerRating} ⭐
          </p>
          <p className="mt-2 text-xs font-medium text-primary">
            {normalizedTier === 'elite'
              ? 'ELITE plan'
              : normalizedTier === 'pro'
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
            <p className="font-semibold text-foreground">{partnerName}</p>
            <p className="text-xs text-muted-foreground">{partnerRating} ⭐</p>
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
    </>
  )
}
