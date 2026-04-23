export interface NavLink {
  label: string
  href: string
  variant?: 'primary' | 'default'
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Domov', href: '/' },
  { label: 'Kako deluje', href: '/kako-deluje' },
  { label: 'Vodiči', href: '/blog' },
  { label: 'Orodja', href: '/orodja' },
  { label: 'E-Ključ', href: '/e-kljuc' },
  { label: 'Za obrtnike', href: '/za-obrtnike', variant: 'primary' },
]
