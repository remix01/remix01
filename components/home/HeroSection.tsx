'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Search, Star, Wrench } from 'lucide-react'
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
    if (!query.trim()) return categories.slice(0, 6)
    return categories.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
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

  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-background to-background pb-10 pt-20 sm:pb-16 sm:pt-28">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:gap-8 lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl border bg-card/90 p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary">Za stranke</p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Najdite pravega mojstra brez stresa.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Vpišite težavo, AI predlaga kategorijo, vi pa v minuti oddate povpraševanje.
          </p>

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
            <Button type="submit" size="lg" className="mt-4 h-12 w-full text-base">
              Poišči mojstra
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border bg-card/90 p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary">Za mojstre</p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-4xl">
            Pridobite več kakovostnih povpraševanj v vaši regiji.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            LiftGO vas poveže z resnimi strankami in omogoča hitrejše pošiljanje ponudb.
          </p>

          <Button asChild size="lg" variant="outline" className="mt-8 h-12 w-full text-base sm:w-auto">
            <Link href="/registracija-mojster">Postani LiftGO partner</Link>
          </Button>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {stats.rating !== null && stats.reviews !== null && (
              <div className="rounded-xl border p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Star className="h-4 w-4 text-amber-500" />
                  {stats.rating.toFixed(1)} ★ ({stats.reviews.toLocaleString('sl-SI')}+ ocen)
                </p>
              </div>
            )}
            {stats.activeCraftsmen !== null && (
              <div className="rounded-xl border p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="h-4 w-4 text-primary" />
                  {stats.activeCraftsmen.toLocaleString('sl-SI')} aktivnih mojstrov
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
