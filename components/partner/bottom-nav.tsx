'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Home, BarChart3, FileText, Bell, User, TrendingUp, Zap, MoreHorizontal } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface PartnerBottomNavProps {
  paket?: {
    paket: 'start' | 'pro' | 'elite'
  }
}

export function PartnerBottomNav({ paket }: PartnerBottomNavProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const [resolvedPaket, setResolvedPaket] = useState<'start' | 'pro' | 'elite'>(paket?.paket ?? 'start')

  useEffect(() => {
    if (paket?.paket) {
      setResolvedPaket(paket.paket)
      return
    }

    const resolveSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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

  const allLinks = useMemo(
    () => [
      { href: '/partner-dashboard', icon: Home, label: 'Domov' },
      { href: '/partner-dashboard/povprasevanja', icon: FileText, label: 'Povpraš.' },
      ...(resolvedPaket === 'pro' || resolvedPaket === 'elite'
        ? [
            { href: '/partner-dashboard/crm', icon: TrendingUp, label: 'CRM' },
            { href: '/partner-dashboard/insights', icon: BarChart3, label: 'Insights' },
            { href: '/partner-dashboard/offers/generate', icon: Zap, label: 'AI ponudbe' },
          ]
        : []),
      { href: '/partner-dashboard/notifications', icon: Bell, label: 'Obvestila' },
      { href: '/partner-dashboard/account', icon: User, label: 'Račun' },
    ],
    [resolvedPaket]
  )

  const primaryLinks = allLinks.slice(0, 4)
  const overflowLinks = allLinks.slice(4)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-t bg-background px-2 lg:hidden">
      {primaryLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors ${
            isActive(link.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <link.icon className="h-5 w-5" />
          <span className="truncate text-[11px] font-medium">{link.label}</span>
        </Link>
      ))}

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="flex h-12 min-w-14 flex-col items-center gap-1 px-1 py-2">
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[11px] font-medium">Več</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-3">
            <SheetTitle>Dodatni meniji</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 pb-6">
            {overflowLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg border p-3 ${
                  isActive(link.href) ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'
                }`}
              >
                <link.icon className="h-4 w-4" />
                <span className="text-sm">{link.label}</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
