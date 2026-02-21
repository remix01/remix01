'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NarocnikBottomNav() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/narocnik/dashboard', icon: '🏠', label: 'Domov' },
    { href: '/narocnik/novo-povprasevanje', icon: '➕', label: 'Novo' },
    { href: '/narocnik/povprasevanja', icon: '📋', label: 'Povpraševanja' },
    { href: '/narocnik/profil', icon: '👤', label: 'Profil' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex justify-around items-center h-20 px-4">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive(link.href)
              ? 'text-primary'
              : 'text-muted-foreground'
          }`}
        >
          <span className="text-xl">{link.icon}</span>
          <span className="text-xs font-medium">{link.label}</span>
        </Link>
      ))}
    </div>
  )
}
