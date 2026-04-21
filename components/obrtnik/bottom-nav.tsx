'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Briefcase, MessageSquare, User, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ObrtknikBottomNavProps {
  unreadMessages?: number
}

export function ObrtknikBottomNav({ unreadMessages = 0 }: ObrtknikBottomNavProps) {
  const pathname = usePathname()

  const navLinks = [
    { href: '/obrtnik/dashboard', icon: Home, label: 'Dom' },
    { href: '/obrtnik/povprasevanja', icon: FileText, label: 'Povpraš.' },
    { href: '/obrtnik/ponudbe', icon: Briefcase, label: 'Ponudbe' },
    { href: '/obrtnik/sporocila', icon: MessageSquare, label: 'Sporočila', badge: unreadMessages },
    { href: '/obrtnik/profil', icon: User, label: 'Profil' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="grid grid-cols-5 bg-white safe-area-inset-bottom">
      {navLinks.map((link) => {
        const Icon = link.icon
        const active = isActive(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex flex-col items-center justify-center py-2.5 transition-colors relative',
              active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <div className="relative">
              <Icon className={cn('w-5 h-5 mb-0.5', active && 'drop-shadow-sm')} />
              {link.badge && link.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
            </div>
            <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>{link.label}</span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
