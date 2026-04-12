'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, BarChart3, FileText, Home, User, TrendingUp, Zap, Bell } from 'lucide-react'

interface PartnerSidebarProps {
  partner: {
    business_name: string
    subscription_tier: 'start' | 'pro' | 'elite'
    avg_rating: number
    is_verified: boolean
  }
}

export function PartnerSidebar({ partner }: PartnerSidebarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)

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

  return (
    <aside className="hidden w-64 border-r bg-muted/50 p-6 lg:flex flex-col">
      <div className="mb-8">
        <Link href="/partner-dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">L</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            LiftGO
          </span>
        </Link>
      </div>

      {/* Partner info card */}
      <div className="mb-8 p-4 bg-background rounded-lg border">
        <p className="font-semibold text-foreground text-sm">{partner.business_name}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          {partner.is_verified && '✓'} {partner.avg_rating.toFixed(1)} ⭐
        </p>
        <p className="text-xs font-medium text-primary mt-2">
          {partner.subscription_tier === 'elite'
            ? 'ELITE plan'
            : partner.subscription_tier === 'pro'
              ? 'PRO plan'
              : 'START plan'}
        </p>
      </div>

      <nav className="space-y-2 mb-8 flex-1">
        <Link
          href="/partner-dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
        >
          <Home className="h-4 w-4" />
          Domov
        </Link>
        <Link
          href="/partner-dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          Statistika
        </Link>
        
        {/* PRO Features */}
        {(partner.subscription_tier === 'pro' || partner.subscription_tier === 'elite') && (
          <>
            <Link
              href="/partner-dashboard/crm"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              CRM
            </Link>
            <Link
              href="/partner-dashboard/offers/generate"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
            >
              <Zap className="h-4 w-4" />
              Generator Ponudb
            </Link>
          </>
        )}

        <Link
          href="/partner-dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
        >
          <FileText className="h-4 w-4" />
          Ponudbe
        </Link>
        <Link
          href="/partner-dashboard/notifications"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
        >
          <Bell className="h-4 w-4" />
          Obvestila
        </Link>
        <Link
          href="/partner-dashboard/account"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
        >
          <User className="h-4 w-4" />
          Račun
        </Link>
      </nav>

      <div className="border-t pt-6">
        <div className="mb-4 rounded-lg bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground">PODJETJE</p>
          <p className="font-semibold text-foreground">{partner.business_name}</p>
          <p className="text-xs text-muted-foreground">{partner.avg_rating.toFixed(1)} ⭐</p>
        </div>
        <button 
          onClick={handleLogout}
          disabled={isLoading}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {isLoading ? 'Odjavljam...' : 'Odjava'}
        </button>
      </div>
    </aside>
  )
}
