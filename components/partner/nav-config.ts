import {
  Home,
  FileText,
  MessageSquare,
  Briefcase,
  User,
  CreditCard,
  Bell,
  BarChart3,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export type PartnerTier = 'start' | 'pro' | 'elite'

export interface PartnerNavLink {
  href: string
  label: string
  icon: LucideIcon
  minTier?: PartnerTier
}

const tierRank: Record<PartnerTier, number> = {
  start: 0,
  pro: 1,
  elite: 2,
}

const isAllowedForTier = (currentTier: PartnerTier, minTier?: PartnerTier) => {
  if (!minTier) return true
  return tierRank[currentTier] >= tierRank[minTier]
}

const partnerMobilePrimaryNav: PartnerNavLink[] = [
  { href: '/partner-dashboard', icon: Home, label: 'Domov' },
  { href: '/partner-dashboard/povprasevanja', icon: FileText, label: 'Povpraš.' },
  { href: '/partner-dashboard/sporocila', icon: MessageSquare, label: 'Sporočila' },
  { href: '/partner-dashboard/offers/generate', icon: Briefcase, label: 'Ponudbe', minTier: 'pro' },
]

const partnerSecondaryNav: PartnerNavLink[] = [
  { href: '/partner-dashboard/account', icon: User, label: 'Profil' },
  { href: '/partner-dashboard/account/narocnina', icon: CreditCard, label: 'Naročnina' },
  { href: '/partner-dashboard/notifications', icon: Bell, label: 'Obvestila' },
  { href: '/partner-dashboard/insights', icon: BarChart3, label: 'Statistika', minTier: 'pro' },
  { href: '/partner-dashboard/crm', icon: TrendingUp, label: 'CRM', minTier: 'pro' },
]

export const getPartnerDesktopNav = (tier: PartnerTier) => [
  ...partnerMobilePrimaryNav.filter((link) => isAllowedForTier(tier, link.minTier)),
  ...partnerSecondaryNav.filter((link) => isAllowedForTier(tier, link.minTier)),
]

export const getPartnerMobilePrimaryNav = (tier: PartnerTier) =>
  partnerMobilePrimaryNav.filter((link) => isAllowedForTier(tier, link.minTier))

export const getPartnerMobileMoreNav = (tier: PartnerTier) =>
  partnerSecondaryNav.filter((link) => isAllowedForTier(tier, link.minTier))
