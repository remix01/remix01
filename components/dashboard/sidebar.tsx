'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Home, BarChart3, Settings } from 'lucide-react'

interface SidebarProps {
  user: any
}

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  const navItems = [
    { icon: Home, label: 'Nadzorna plošča', href: '/' },
    { icon: BarChart3, label: 'Analitika', href: '/' },
    { icon: Settings, label: 'Nastavitve', href: '/' },
  ]

  return (
    <div className="w-64 border-r bg-card p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-primary">
          Lift<span className="text-accent">GO</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Upravljalna plošča</p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="border-t pt-4">
        <div className="mb-4 text-sm">
          <p className="font-medium text-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Prijavljeni ste</p>
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
