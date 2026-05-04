'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

const portalCards = [
  {
    title: 'Za stranke',
    points: ['Spremljanje povpraševanj', 'Ponudbe mojstrov', 'Ocene in zgodovina'],
    cta: 'Odpri dashboard',
    href: '/dashboard',
  },
  {
    title: 'Za mojstre',
    points: ['Upravljanje leadov', 'Ponudbe in komunikacija', 'Profil, naročnina in statistika'],
    cta: 'Odpri partner portal',
    href: '/partner-dashboard',
  },
  {
    title: 'Za administracijo',
    points: ['Nadzor uporabnikov', 'Preverjanje mojstrov', 'Metrike, vsebina in varnost'],
    cta: 'Admin portal',
    href: '/admin',
  },
]

export function PortalOverviewSection() {
  return (
    <section className="border-b bg-muted/30 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          En sistem za stranke, mojstre in administracijo
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {portalCards.map((card) => (
            <article key={card.title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {card.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link href={card.href}>{card.cta}</Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
