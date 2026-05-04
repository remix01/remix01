'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CheckCircle2, Mic, ScanSearch, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { HomeStats } from './types'

interface HeroSectionProps {
  stats: HomeStats
  categories?: Array<{ label: string; slug: string }>
}

export function HeroSection({ stats, categories = [] }: HeroSectionProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return categories
    return categories.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
  }, [query, categories])

  const redirectHref = useMemo(() => {
    const category = (selectedCategory || query).trim()
    const params = new URLSearchParams()
    if (category) params.set('kategorija', category)
    return `/povprasevanje/novo?${params.toString()}`
  }, [query, selectedCategory])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(redirectHref)
  }

  function openConcierge() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('liftgo:open-concierge', '1')
      window.dispatchEvent(new CustomEvent('liftgo:open-concierge'))
    }
  }

  const featureBadges = [
    { label: 'AI Concierge', icon: Sparkles },
    { label: 'Glasovni opis', icon: Mic },
    { label: 'Slika/video diagnoza', icon: ScanSearch },
    { label: 'Pametna kategorija', icon: Search },
    { label: 'Preverjeni mojstri', icon: ShieldCheck },
  ]

  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-background to-background pb-10 pt-20 sm:pb-16 sm:pt-28">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:gap-8 lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl border bg-card/90 p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary">AI-powered SaaS marketplace</p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            AI vam pomaga najti pravega mojstra brez stresa.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Opišite težavo z besedilom, glasom, sliko ali videom. LiftGO AI predlaga pravo kategorijo, pripravi boljše
            povpraševanje in vas poveže s preverjenimi mojstri.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {featureBadges.map((feature) => (
              <span key={feature.label} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium">
                <feature.icon className="h-3.5 w-3.5 text-primary" />
                {feature.label}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 rounded-xl border bg-background p-3">
            <label htmlFor="hero-search" className="sr-only">Kaj potrebujete?</label>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                id="hero-search"
                placeholder="Npr. pušča pipa v kuhinji"
                className="h-11 border-0 px-0 text-base focus-visible:ring-0"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedCategory('')
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {filtered.length > 0 ? (
                filtered.map((category) => (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category.label)
                      setQuery(category.label)
                    }}
                    className="min-h-11 rounded-full border px-3 py-2 text-sm hover:bg-muted"
                  >
                    {category.label}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Ni ujemajočih kategorij.</p>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button type="submit" size="lg" className="h-12 w-full text-base sm:flex-1">
                Poišči mojstra
              </Button>
              <Button type="button" size="lg" variant="outline" className="h-12 w-full text-base sm:w-auto" onClick={openConcierge}>
                Odpri AI pomočnika
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border bg-card/90 p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary">AI analiza povpraševanja</p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-4xl">"Pušča pipa v kuhinji"</h2>
          <div className="mt-4 space-y-3 rounded-xl border bg-background p-4">
            <p className="text-sm"><span className="font-semibold">Predlagana kategorija:</span> Vodovodna dela</p>
            <p className="text-sm"><span className="font-semibold">Nujnost:</span> čim prej</p>
            <p className="text-sm"><span className="font-semibold">Priporočilo:</span> dodajte sliko ali video za hitrejšo oceno</p>
            <p className="text-sm"><span className="font-semibold">Naslednji korak:</span> oddaj povpraševanje</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-3 text-sm font-medium">
              {stats.activeCraftsmen !== null
                ? `${stats.activeCraftsmen.toLocaleString('sl-SI')} aktivnih mojstrov`
                : 'Aktivni mojstri'}
            </div>
            <div className="rounded-xl border p-3 text-sm font-medium">Preverjeni profili</div>
            <div className="rounded-xl border p-3 text-sm font-medium">Ponudbe brez obveznosti</div>
          </div>

          {stats.rating !== null && stats.reviews !== null && (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Ocena uporabnikov: {stats.rating.toFixed(1)} ({stats.reviews.toLocaleString('sl-SI')}+ ocen)
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
