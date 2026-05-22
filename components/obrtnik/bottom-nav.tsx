'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Briefcase, BarChart3, MessageCircle, User } from 'lucide-react'

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href === '/partner-dashboard') return false
  return pathname.startsWith(`${href}/`)
}

export function ObrtknikBottomNav() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/partner-dashboard', icon: Home, label: 'Dom' },
    { href: '/obrtnik/povprasevanja', icon: FileText, label: 'Povpraš.' },
    { href: '/obrtnik/ponudbe', icon: Briefcase, label: 'Ponudbe' },
    { href: '/obrtnik/sporocila', icon: MessageCircle, label: 'Sporočila' },
    { href: '/obrtnik/statistike', icon: BarChart3, label: 'Statistika' },
    { href: '/obrtnik/profil', icon: User, label: 'Profil' },
  ]

  return (
    <nav className="grid grid-cols-6 bg-white" aria-label="Mobilna navigacija">
      {navLinks.map((link) => {
        const Icon = link.icon
        const active = isNavActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center py-2 transition-colors min-w-0 ${
              active
                ? 'text-primary'
                : 'text-gray-600'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5 flex-shrink-0" />
            <span className="text-[10px] font-medium leading-tight truncate max-w-full px-0.5">{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
