export type DashboardRole = 'admin' | 'partner' | 'customer'

export const DASHBOARD_PATHS: Record<DashboardRole, string> = {
  admin: '/admin',
  partner: '/partner-dashboard',
  customer: '/dashboard',
}

export interface NavLink {
  label: string
  href: string
  variant?: 'primary' | 'default'
}

export interface FooterLink {
  label: string
  href: string
  disabled?: boolean
  requiresAuth?: boolean
}

export interface FooterSection {
  title: string
  links: FooterLink[]
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Domov', href: '/' },
  { label: 'Kako deluje', href: '/kako-deluje' },
  { label: 'Vodiči', href: '/blog' },
  { label: 'Orodja', href: '/orodja' },
  { label: 'E-Ključ', href: '/e-kljuc' },
  { label: 'Za obrtnike', href: '/za-obrtnike', variant: 'primary' },
]

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Storitve',
    links: [
      { label: 'Gradnja & adaptacije', href: '/search?storitev=Gradnja+%26+adaptacije' },
      { label: 'Vodovod & ogrevanje', href: '/search?storitev=Vodovod+%26+ogrevanje' },
      { label: 'Elektrika & pametni sistemi', href: '/search?storitev=Elektrika+%26+pametni+sistemi' },
      { label: 'Mizarstvo & kovinarstvo', href: '/search?storitev=Mizarstvo+%26+kovinarstvo' },
      { label: 'Zaključna dela', href: '/search?storitev=Zaklju%C4%8Dna+dela' },
      { label: 'Okolica & zunanja ureditev', href: '/search?storitev=Okolica+%26+zunanja+ureditev' },
    ],
  },
  {
    title: 'Za obrtnike',
    links: [
      { label: 'Cenik za obrtnike', href: '/cenik' },
      { label: 'Postanite partner', href: '/partner-auth/sign-up' },
      { label: 'Prijava za partnerje', href: '/partner-auth/login' },
      { label: 'Nadzorna plošča', href: '/partner-dashboard', requiresAuth: true },
    ],
  },
  {
    title: 'Podjetje',
    links: [
      { label: 'O nas', href: '/about' },
      { label: 'Kariera (kmalu)', href: '', disabled: true },
      { label: 'Blog (kmalu)', href: '', disabled: true },
      { label: 'Kontakt', href: '/contact' },
    ],
  },
  {
    title: 'Podpora',
    links: [
      { label: 'Orodja za lastnike', href: '/orodja' },
      { label: 'Video Diagnoza', href: '/#video-diagnoza' },
      { label: 'E-Ključ', href: '/e-kljuc' },
      { label: 'Pogosta vprašanja', href: '/faq' },
      { label: 'Pomoč', href: '/contact' },
      { label: 'Pogoji uporabe', href: '/terms' },
      { label: 'Zasebnost', href: '/privacy' },
    ],
  },
]
