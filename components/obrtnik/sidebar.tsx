'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, FileText, Star, User } from 'lucide-react'

interface ObrtknikSidebarProps {
  fullName: string
}

export function ObrtknikSidebar({ fullName }: ObrtknikSidebarProps) {
  const pathname = usePathname()

  const navLinks = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/povprasevanja', icon: FileText, label: 'Povpraševanja' },
    { href: '/obrtnik/ponudbe', icon: Briefcase, label: 'Moje ponudbe' },
    { href: '/ocene', icon: Star, label: 'Ocene' },
    { href: '/profil', icon: User, label: 'Profil' },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/dashboard">
          <h1 className="text-2xl font-bold text-primary">LiftGO</h1>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-6 border-b">
        <p className="text-sm text-gray-600">Prijavljen kot</p>
        <p className="font-semibold text-gray-900">{fullName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navLinks.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
