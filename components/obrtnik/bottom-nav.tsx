'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Briefcase, BarChart3, MessageCircle, User } from 'lucide-react'

export function ObrtknikBottomNav() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/obrtnik/dashboard', icon: Home, label: 'Dom' },
    { href: '/obrtnik/povprasevanja', icon: FileText, label: 'Povpraševanja' },
    { href: '/obrtnik/ponudbe', icon: Briefcase, label: 'Ponudbe' },
    { href: '/obrtnik/sporocila', icon: MessageCircle, label: 'Sporočila' },
    { href: '/obrtnik/statistike', icon: BarChart3, label: 'Statistika' },
    { href: '/obrtnik/profil', icon: User, label: 'Profil' },
  ]

  return (
    <div className="grid grid-cols-6 bg-white">
      {navLinks.map((link) => {
        const Icon = link.icon
        const isActive = pathname === link.href || (link.href !== '/obrtnik/dashboard' && pathname.startsWith(`${link.href}/`))
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
