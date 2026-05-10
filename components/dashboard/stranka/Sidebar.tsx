'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, FileText, MessageSquare, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SidebarProps {
  mobile?: boolean
}

const navItems = [
  {
    name: 'Pregled',
    href: '/dashboard',
    icon: LayoutGrid,
  },
  {
    name: 'Moja povpraševanja',
    href: '/povprasevanja',
    icon: FileText,
  },
  {
    name: 'Sporočila',
    href: '/sporocila',
    icon: MessageSquare,
  },
  {
    name: 'Profil',
    // TODO(route-consolidation): switch to /profil once legacy profile parity
    // decision is finalized for /dashboard/stranka/profil.
    href: '/dashboard/stranka/profil',
    icon: User,
  },
]

export function Sidebar({ mobile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      await supabase.auth.signOut()
      router.replace('/prijava')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (mobile) {
    return (
      <div className="flex items-center justify-between gap-1 overflow-x-auto px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-w-16 shrink-0 flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="min-w-16 shrink-0 flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">{isLoggingOut ? '...' : 'Odjava'}</span>
        </button>
      </div>
    )
  }

  // Desktop sidebar
  return (
    <div className="flex flex-col h-full p-6">
      {/* Logo/Title */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900">LiftGO</h2>
        <p className="text-sm text-slate-600 mt-1">Nadzorna plošča</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors font-medium mt-auto disabled:opacity-50"
      >
        <LogOut className="w-5 h-5" />
        {isLoggingOut ? 'Odjavljam...' : 'Odjava'}
      </button>
    </div>
  )
}
