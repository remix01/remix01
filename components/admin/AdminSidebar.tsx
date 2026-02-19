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
  LogOut 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface AdminSidebarProps {
  user: {
    name: string
    email: string
  }
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Stranke', href: '/admin/stranke' },
  { icon: Briefcase, label: 'Partnerji', href: '/admin/partnerji' },
  { icon: AlertTriangle, label: 'Violations', href: '/admin/violations' },
  { icon: ShieldAlert, label: 'Risk Alerts', href: '/admin/risk-alerts' },
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

  return (
    <div className="w-64 border-r bg-card p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-primary">
          Lift<span className="text-accent">GO</span>
        </h1>
        <p className="mt-1 text-sm font-medium text-destructive">Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
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
          <p className="font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
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
