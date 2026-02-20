'use client'

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
  UserCog
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type Vloga = 'SUPER_ADMIN' | 'MODERATOR' | 'OPERATER'

interface AdminSidebarProps {
  user: {
    ime: string
    priimek: string
    email: string
    vloga: Vloga
  }
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  roles?: Vloga[]
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Stranke', href: '/admin/stranke' },
  { icon: Briefcase, label: 'Partnerji', href: '/admin/partnerji' },
  { icon: AlertTriangle, label: 'Violations', href: '/admin/violations' },
  { icon: ShieldAlert, label: 'Risk Alerts', href: '/admin/risk-alerts' },
  { icon: UserCog, label: 'Zaposleni', href: '/admin/zaposleni', roles: ['SUPER_ADMIN'] },
  { icon: Settings, label: 'Nastavitve', href: '/admin/nastavitve' },
]

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(user.vloga)
  })

  const getRoleLabel = (vloga: Vloga) => {
    const roleLabels: Record<Vloga, string> = {
      SUPER_ADMIN: 'Super Admin',
      MODERATOR: 'Moderator',
      OPERATER: 'Operater',
    }
    return roleLabels[vloga]
  }

  return (
    <div className="w-64 border-r bg-card p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-primary">
          Lift<span className="text-accent">GO</span>
        </h1>
        <p className="mt-1 text-sm font-medium text-destructive">Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-1">
        {visibleNavItems.map((item) => {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
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
          className="w-full flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          <LogOut className="h-4 w-4" />
          Odjava
        </button>
      </div>
    </div>
  )
}
