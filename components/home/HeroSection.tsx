'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Mic, ScanSearch, Search, ShieldCheck, Sparkles, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HeroFormDialog } from '@/components/hero-form-dialog'
import type { HomeStats } from './types'

type DemoScene = 'analyze' | 'match' | 'done'

interface DemoCraftsman {
  initials: string
  name: string
  spec: string
  rating: number
  price: number
}

const DEMO_CRAFTSMEN: DemoCraftsman[] = [
  { initials: 'MB', name: 'Marko Breznik', spec: 'Vodovodar · 8 let', rating: 4.9, price: 45 },
  { initials: 'JK', name: 'Janez Kovač', spec: 'Vodovodar · 12 let', rating: 5.0, price: 38 },
  { initials: 'TP', name: 'Tomaž Petric', spec: 'Vodovodar · 5 let', rating: 4.7, price: 52 },
]

const ANALYSIS_LINES = [
  { label: 'Kategorija', value: 'Vodovodna dela' },
  { label: 'Nujnost', value: 'čim prej' },
  { label: 'Priporočilo', value: 'dodajte sliko za hitrejšo oceno' },
]

function useHeroDemo() {
  const [scene, setScene] = useState<DemoScene>('analyze')
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [visibleCraftsmen, setVisibleCraftsmen] = useState(0)
  const [doneRating, setDoneRating] = useState(0)
  const [paused, setPaused] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const schedule = useCallback((fn: () => void, delay: number) => {
    timersRef.current.push(setTimeout(fn, delay))
  }, [])

  useEffect(() => {
    if (paused) return

    function reset() {
      setScene('analyze')
      setAnalysisProgress(0)
      setVisibleCraftsmen(0)
      setDoneRating(0)
    }

    function run() {
      reset()
      schedule(() => setAnalysisProgress(1), 400)
      schedule(() => setAnalysisProgress(2), 900)
      schedule(() => setAnalysisProgress(3), 1400)

      schedule(() => { setScene('match'); setVisibleCraftsmen(0) }, 2800)
      schedule(() => setVisibleCraftsmen(1), 3200)
      schedule(() => setVisibleCraftsmen(2), 3800)
      schedule(() => setVisibleCraftsmen(3), 4400)

      schedule(() => { setScene('done'); setDoneRating(0) }, 6200)
      schedule(() => setDoneRating(1), 6600)
      schedule(() => setDoneRating(2), 6800)
      schedule(() => setDoneRating(3), 7000)
      schedule(() => setDoneRating(4), 7200)
      schedule(() => setDoneRating(5), 7400)

      schedule(() => run(), 10000)
    }

    run()
    return clearTimers
  }, [paused, schedule, clearTimers])

  return { scene, analysisProgress, visibleCraftsmen, doneRating, setPaused }
}

interface HeroSectionProps {
  stats: HomeStats
  categories?: Array<{ label: string; slug: string }>
}

export function HeroSection({ stats, categories = [] }: HeroSectionProps) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return categories
    return categories.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
  }, [query, categories])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setShowForm(true)
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
      <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 sm:gap-8 lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl border bg-card/90 p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary">LiftGO-AI</p>
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

        <HeroDemoPanel stats={stats} />
      </div>

      <HeroFormDialog open={showForm} onOpenChange={setShowForm} initialQuery={query} initialStoritev={selectedCategory || query} />
    </section>
  )
}

// ── Interactive AI Demo Panel ─────────────────────────────────────
function HeroDemoPanel({ stats }: { stats: HomeStats }) {
  const { scene, analysisProgress, visibleCraftsmen, doneRating, setPaused } = useHeroDemo()

  const sceneLabels: Record<DemoScene, string> = {
    analyze: 'AI analizira povpraševanje…',
    match: 'Iskanje najboljših mojstrov…',
    done: 'Delo zaključeno!',
  }

  const steps: { key: DemoScene; label: string }[] = [
    { key: 'analyze', label: 'Analiza' },
    { key: 'match', label: 'Ponudbe' },
    { key: 'done', label: 'Zaključek' },
  ]
  const sceneOrder: DemoScene[] = ['analyze', 'match', 'done']
  const currentIdx = sceneOrder.indexOf(scene)

  return (
    <div
      className="rounded-2xl border bg-card/90 p-5 shadow-sm sm:p-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">AI demo</p>
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span
                className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium transition-colors duration-300 ${
                  i === currentIdx
                    ? 'bg-primary text-primary-foreground'
                    : i < currentIdx
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`h-px w-3 transition-colors duration-300 ${i < currentIdx ? 'bg-primary/40' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
        &ldquo;Pušča pipa v kuhinji&rdquo;
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{sceneLabels[scene]}</p>

      <div className="relative mt-4 min-h-[220px] overflow-hidden rounded-xl border bg-background">
        {/* Scene 1: AI Analysis */}
        <div
          className={`absolute inset-0 p-4 transition-all duration-400 ${
            scene === 'analyze' ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            LiftGO AI analizira vaš opis…
          </div>
          <div className="mt-3 space-y-2.5">
            {ANALYSIS_LINES.map((line, i) => (
              <div
                key={line.label}
                className={`flex items-start gap-2 rounded-lg border p-2.5 transition-all duration-400 ${
                  i < analysisProgress ? 'translate-x-0 border-primary/30 bg-primary/5 opacity-100' : 'translate-x-3 opacity-0'
                }`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <p className="text-sm">
                  <span className="font-semibold">{line.label}:</span>{' '}
                  <span className="text-muted-foreground">{line.value}</span>
                </p>
              </div>
            ))}
          </div>
          {analysisProgress >= 3 && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
              <Zap className="h-3.5 w-3.5" />
              Analiza končana — iščemo mojstre…
            </div>
          )}
        </div>

        {/* Scene 2: Matched Craftsmen */}
        <div
          className={`absolute inset-0 p-4 transition-all duration-400 ${
            scene === 'match' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary">Najdeni mojstri</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors duration-300 ${
              visibleCraftsmen >= 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary/10 text-primary'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${visibleCraftsmen >= 3 ? 'bg-green-500' : 'animate-pulse bg-primary'}`} />
              {visibleCraftsmen} / 3
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {DEMO_CRAFTSMEN.map((c, i) => (
              <div
                key={c.initials}
                className={`flex items-center gap-3 rounded-lg border p-2.5 transition-all duration-400 ${
                  i < visibleCraftsmen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                } ${i === 1 ? 'border-primary/40 bg-primary/5' : ''}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.spec}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{c.price}€<span className="text-xs font-normal text-muted-foreground">/h</span></p>
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
                    <span className="text-xs text-muted-foreground">{c.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scene 3: Success */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center p-4 transition-all duration-400 ${
            scene === 'done' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <p className="mt-3 text-base font-bold">Delo opravljeno!</p>
          <p className="mt-1 text-xs text-muted-foreground">Janez Kovač · Popravilo puščanja pipe</p>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-5 w-5 transition-all duration-200 ${
                  n <= doneRating
                    ? 'scale-110 fill-orange-400 text-orange-400'
                    : 'fill-transparent text-muted-foreground/30'
                }`}
                style={{ transitionDelay: `${n * 60}ms` }}
              />
            ))}
            {doneRating >= 5 && (
              <span className="ml-1.5 text-sm font-semibold text-orange-500">5.0</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row — preserved from original */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
  )
}
