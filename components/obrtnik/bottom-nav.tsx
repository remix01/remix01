'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Briefcase, User } from 'lucide-react'

export function ObrtknikBottomNav() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/obrtnik/dashboard', icon: Home, label: 'Dom' },
    { href: '/obrtnik/povprasevanja', icon: FileText, label: 'Povpraševanja' },
    { href: '/obrtnik/ponudbe', icon: Briefcase, label: 'Ponudbe' },
    { href: '/obrtnik/profil', icon: User, label: 'Profil' },
  ]

  return (
    <div className="grid grid-cols-4 bg-white">
      {navLinks.map((link) => {
        const Icon = link.icon
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center py-3 transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-gray-600'
            }`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{link.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
