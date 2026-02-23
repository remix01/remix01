'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface NarocnikSidebarProps {
  fullName: string | null
}

export function NarocnikSidebar({ fullName }: NarocnikSidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/prijava'
  }

  const navLinks = [
    { href: '/narocnik/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/narocnik/novo-povprasevanje', icon: '➕', label: 'Novo povpraševanje' },
    { href: '/narocnik/povprasevanja', icon: '📋', label: 'Moja povpraševanja' },
    { href: '/narocnik/obvestila', icon: '🔔', label: 'Obvestila' },
    { href: '/narocnik/profil', icon: '👤', label: 'Profil' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex flex-col h-full bg-[#001a33] text-white p-6">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/narocnik/dashboard" className="text-2xl font-bold text-white">
          LiftGO
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
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

      {/* Bottom User Section */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <div className="px-2">
          <p className="text-xs text-gray-400 mb-1">Prijavljeni kot</p>
          <p className="text-sm font-medium truncate">{fullName || 'Uporabnik'}</p>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full text-white border-gray-600 hover:bg-[#002d4d] hover:text-white"
        >
          Odjava
        </Button>
      </div>
    </div>
  )
}
