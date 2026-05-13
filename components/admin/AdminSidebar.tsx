'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  AlertTriangle,
  ShieldAlert,
  Users,
  Briefcase,
  Settings,
  LogOut,
  Database,
  UserCog,
  RefreshCw,
  CreditCard,
  Plug,
  BrainCircuit,
  LineChart,
  Wallet,
  Eye,
  Handshake,
  ListChecks,
  Bot,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Button } from '@/components/ui/button'

type Vloga = 'SUPER_ADMIN' | 'MODERATOR' | 'OPERATER'

type NavSectionKey = 'core' | 'operations' | 'growth' | 'system'

interface AdminSidebarProps {
  user: {
    ime: string
    priimek: string
    email: string
    vloga: Vloga
  }
}

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  section: NavSectionKey
  roles?: Vloga[]
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Overview', href: '/admin', section: 'core' },
  { icon: Users, label: 'Stranke', href: '/admin/stranke', section: 'core' },
  { icon: Briefcase, label: 'Partnerji', href: '/admin/partnerji', section: 'core' },
  { icon: Users, label: 'Obrtniki', href: '/admin/obrtniki', section: 'core' },
  { icon: Handshake, label: 'Ponudbe', href: '/admin/offers', section: 'core' },
  { icon: AlertTriangle, label: 'Povpraševanja', href: '/admin/povprasevanja', section: 'core' },
  { icon: Target, label: 'Lidi', href: '/admin/leads', section: 'core', roles: ['SUPER_ADMIN', 'MODERATOR'] },

  { icon: ShieldAlert, label: 'Spori', href: '/admin/disputes', section: 'operations' },
  { icon: AlertTriangle, label: 'Violations', href: '/admin/violations', section: 'operations' },
  { icon: ShieldAlert, label: 'Risk Alerts', href: '/admin/risk-alerts', section: 'operations' },
  { icon: ListChecks, label: 'Verifikacije', href: '/admin/verifikacije', section: 'operations' },
  { icon: Wallet, label: 'Monetizacija', href: '/admin/monetization', section: 'operations', roles: ['SUPER_ADMIN'] },
  { icon: CreditCard, label: 'Plačila', href: '/admin/placila', section: 'operations', roles: ['SUPER_ADMIN', 'MODERATOR'] },
  { icon: CreditCard, label: 'Finance', href: '/admin/finance', section: 'operations', roles: ['SUPER_ADMIN', 'MODERATOR'] },

  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', section: 'growth' },
  { icon: LineChart, label: 'Analitika', href: '/admin/analytics', section: 'growth' },
  { icon: BrainCircuit, label: 'AI Analitika', href: '/admin/ai-analytics', section: 'growth', roles: ['SUPER_ADMIN', 'MODERATOR'] },
  { icon: BrainCircuit, label: 'AI Stroški', href: '/admin/ai-costs', section: 'growth', roles: ['SUPER_ADMIN', 'MODERATOR'] },
  { icon: Bot, label: 'Agent', href: '/admin/agent', section: 'growth', roles: ['SUPER_ADMIN', 'MODERATOR'] },

  { icon: Briefcase, label: 'Kategorije', href: '/admin/categories', section: 'system', roles: ['SUPER_ADMIN', 'MODERATOR'] },
  { icon: Database, label: 'Data Quality', href: '/admin/data-quality', section: 'system', roles: ['SUPER_ADMIN', 'MODERATOR'] },
  { icon: Eye, label: 'Observability', href: '/admin/observability', section: 'system', roles: ['SUPER_ADMIN'] },
  { icon: UserCog, label: 'Zaposleni', href: '/admin/zaposleni', section: 'system', roles: ['SUPER_ADMIN'] },
  { icon: Plug, label: 'Integracije', href: '/admin/integracije', section: 'system', roles: ['SUPER_ADMIN'] },
  { icon: RefreshCw, label: 'Migracije', href: '/admin/migracije', section: 'system', roles: ['SUPER_ADMIN'] },
  { icon: Settings, label: 'Nastavitve', href: '/admin/nastavitve', section: 'system' },
]

const sectionLabels: Record<NavSectionKey, string> = {
  core: 'Glavno',
  operations: 'Operativa',
  growth: 'Analitika in AI',
  system: 'Sistem',
}

const defaultSectionVisibility: Record<NavSectionKey, boolean> = {
  core: true,
  operations: true,
  growth: true,
  system: true,
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [showCustomizer, setShowCustomizer] = useState(false)

  const [sectionVisibility, setSectionVisibility] = useLocalStorage<Record<NavSectionKey, boolean>>(
    `admin-sidebar-sections-${user.vloga}`,
    defaultSectionVisibility,
  )

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Admin logout error:', error)
      return
    }

    router.replace('/prijava')
    router.refresh()
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(user.vloga)) return false
    return sectionVisibility[item.section]
  })

  const navItemsBySection = useMemo(() => {
    const grouped: Record<NavSectionKey, NavItem[]> = {
      core: [],
      operations: [],
      growth: [],
      system: [],
    }

    visibleNavItems.forEach((item) => {
      grouped[item.section].push(item)
    })

    return grouped
  }, [visibleNavItems])

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const getRoleLabel = (vloga: Vloga) => {
    const roleLabels: Record<Vloga, string> = {
      SUPER_ADMIN: 'Super Admin',
      MODERATOR: 'Moderator',
      OPERATER: 'Operater',
    }
    return roleLabels[vloga]
  }

  return (
    <div className="flex h-full w-full max-w-64 flex-col border-r bg-card p-4 md:p-6">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-primary">
          Lift<span className="text-accent">GO</span>
        </h1>
        <p className="mt-1 text-sm font-medium text-destructive">Admin Panel</p>
      </div>

      <div className="mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setShowCustomizer((prev) => !prev)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Prilagodi sidebar
        </Button>

        {showCustomizer && (
          <div className="mt-2 rounded-lg border p-3 space-y-2">
            {Object.entries(sectionLabels).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={sectionVisibility[key as NavSectionKey]}
                  onChange={(e) => {
                    const section = key as NavSectionKey
                    setSectionVisibility({
                      ...sectionVisibility,
                      [section]: e.target.checked,
                    })
                  }}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
        {(Object.keys(sectionLabels) as NavSectionKey[]).map((section) => {
          const sectionItems = navItemsBySection[section]
          if (!sectionItems.length) return null

          return (
            <div key={section}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {sectionLabels[section]}
              </p>

              <div className="space-y-1">
                {sectionItems.map((item) => {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t pt-4 space-y-3">
        <div className="text-sm">
          <p className="font-medium text-foreground">{user.ime} {user.priimek}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="text-xs font-medium text-primary mt-1">{getRoleLabel(user.vloga)}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          <LogOut className="h-4 w-4" />
          Odjava
        </button>
      </div>
    </div>
  )
}
