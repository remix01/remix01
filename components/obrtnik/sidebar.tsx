'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Briefcase,
  FileText,
  BarChart3,
  User,
  MessageSquare,
  CreditCard,
  Clock,
  Image,
  ChevronRight,
  UserCircle,
  LogOut,
  Settings,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ObrtknikSidebarProps {
  fullName: string
  subscriptionTier?: string
  unreadMessages?: number
}

const navLinks = [
  { href: '/obrtnik/dashboard', icon: Home, label: 'Pregled' },
  { href: '/obrtnik/povprasevanja', icon: FileText, label: 'Povpraševanja' },
  { href: '/obrtnik/ponudbe', icon: Briefcase, label: 'Moje ponudbe' },
  { href: '/obrtnik/sporocila', icon: MessageSquare, label: 'Sporočila', badge: 'unread' },
  { href: '/obrtnik/statistike', icon: BarChart3, label: 'Statistika' },
]

const secondaryLinks = [
  { href: '/obrtnik/portfolio', icon: Image, label: 'Portfolio' },
  { href: '/obrtnik/razpolozljivost', icon: Clock, label: 'Razpoložljivost' },
  { href: '/obrtnik/profil', icon: User, label: 'Profil' },
  { href: '/obrtnik/narocnina', icon: CreditCard, label: 'Naročnina' },
]

export function ObrtknikSidebar({ fullName, subscriptionTier, unreadMessages = 0 }: ObrtknikSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* Logo */}
      <div className="p-5 border-b">
        <Link href="/obrtnik/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <h1 className="text-xl font-bold text-primary">LiftGO</h1>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{fullName}</p>
            <Badge
              variant={subscriptionTier === 'pro' ? 'default' : 'outline'}
              className="text-xs h-4 px-1.5 mt-0.5"
            >
              {subscriptionTier?.toUpperCase() || 'START'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">Glavno</p>
        {navLinks.map((link) => {
          const Icon = link.icon
          const active = isActive(link.href)
          const showBadge = link.badge === 'unread' && unreadMessages > 0
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium flex-1">{link.label}</span>
              {showBadge && (
                <span className={cn(
                  'text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center',
                  active ? 'bg-white text-primary' : 'bg-primary text-white'
                )}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
              {!showBadge && !active && (
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
              )}
            </Link>
          )
        })}

        <div className="pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">Nastavitve</p>
          {secondaryLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group',
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium flex-1">{link.label}</span>
                {!active && (
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Customer Switch + Logout */}
      <div className="p-3 border-t space-y-2">
        <Link href="/narocnik/dashboard">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-sm border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
          >
            <UserCircle className="w-4 h-4" />
            <span>Preklopite na naročnika</span>
          </Button>
        </Link>
        <Link href="/partner-auth/logout">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Odjava</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
