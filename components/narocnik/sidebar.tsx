'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface NarocnikSidebarProps {
  fullName: string | null
  onNavigate?: () => void
}

export function NarocnikSidebar({ fullName, onNavigate }: NarocnikSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error)
      return
    }

    onNavigate?.()
    router.replace('/prijava')
    router.refresh()
  }

  const navLinks = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/novo-povprasevanje', icon: '➕', label: 'Novo povpraševanje' },
    { href: '/povprasevanja', icon: '📋', label: 'Moja povpraševanja' },
    { href: '/sporocila', icon: '💬', label: 'Sporočila' },
    { href: '/obvestila', icon: '🔔', label: 'Obvestila' },
    { href: '/moj-dom', icon: '🏡', label: 'Moj dom' },
    { href: '/profil', icon: '👤', label: 'Profil' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex h-full flex-col bg-[#001a33] p-6 text-white">
      <div className="mb-8">
        <Link href="/dashboard" className="text-2xl font-bold text-white" onClick={onNavigate}>
          LiftGO
        </Link>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
              isActive(link.href)
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-[#002d4d]'
            }`}
          >
            <span>{link.icon}</span>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="space-y-3 border-t border-gray-700 pt-4">
        <div className="px-2">
          <p className="mb-1 text-xs text-gray-400">Prijavljeni kot</p>
          <p className="truncate text-sm font-medium">{fullName || 'Uporabnik'}</p>
        </div>
        <Button
          type="button"
          onClick={handleLogout}
          variant="outline"
          className="w-full border-gray-600 text-white hover:bg-[#002d4d] hover:text-white"
        >
          Odjava
        </Button>
      </div>
    </div>
  )
}
