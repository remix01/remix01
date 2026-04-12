"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle, Star, Clock, Shield } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { HeroFormDialog } from "@/components/hero-form-dialog"
import dynamic from "next/dynamic"

// Lazy load the heavy demonstrator
const HeroDemonstrator = dynamic(
  () => import("@/components/hero-demonstrator"),
  { loading: () => <div className="w-full h-full bg-slate-100 rounded-2xl animate-pulse" /> }
)

const STORITVE = [
  "Gradnja & adaptacije",
  "Vodovod & ogrevanje",
  "Elektrika & pametni sistemi",
  "Mizarstvo & kovinarstvo",
  "Zaključna dela",
  "Okna, vrata & senčila",
  "Okolica & zunanja ureditev",
  "Vzdrževanje & popravila",
  "Poslovne storitve",
  "Drugo",
]

const LOKACIJE = [
  "Ljubljana",
  "Maribor",
  "Celje",
  "Kranj",
  "Koper",
  "Novo Mesto",
  "Velenje",
  "Murska Sobota",
  "Ptuj",
  "Kamnik",
  "Domžale",
  "Škofja Loka",
  "Trbovlje",
  "Krško",
  "Postojna",
  "Slovenj Gradec",
  "Jesenice",
  "Nova Gorica",
  "Brežice",
  "Izola",
]

// Fallback stats if API fails
const FALLBACK_STATS = {
  successfulConnections: 347,
  activeArtisans: 225,
  rating: 4.9,
  reviews: 1200,
}

type HeroStats = typeof FALLBACK_STATS

export function Hero({ initialStats = FALLBACK_STATS }: { initialStats?: HeroStats }) {
  const [showForm, setShowForm] = useState(false)
  const [lokacijaInput, setLokacijaInput] = useState("")
  const [filteredLokacije, setFilteredLokacije] = useState<string[]>([])
  const [showLokacijaSuggestions, setShowLokacijaSuggestions] = useState(false)
  const [selectedService, setSelectedService] = useState("")
  const [stats, setStats] = useState(initialStats)
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch real stats from public API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats/public', { cache: 'no-store' })
        
        if (!response.ok) {
          console.error('[v0] Stats API error:', response.status)
          setStatsLoading(false)
          return
        }

        const data = await response.json()
        
        if (data.successfulConnections) {
          setStats({
            successfulConnections: data.successfulConnections || FALLBACK_STATS.successfulConnections,
            activeArtisans: data.activeArtisans || FALLBACK_STATS.activeArtisans,
            rating: data.rating || FALLBACK_STATS.rating,
            reviews: data.reviews || FALLBACK_STATS.reviews,
          })
          console.log('[v0] Hero stats loaded:', data)
        }
      } catch (error) {
        console.error('[v0] Error fetching hero stats:', error)
        // Use fallback stats
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const handleLokacijaChange = (value: string) => {
    setLokacijaInput(value)

    if (value.trim() === "") {
      setFilteredLokacije([])
      setShowLokacijaSuggestions(false)
    } else {
      const filtered = LOKACIJE.filter((lok) =>
        lok.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredLokacije(filtered)
      setShowLokacijaSuggestions(filtered.length > 0)
    }
  }

  const selectLokacija = (lokacija: string) => {
    setLokacijaInput(lokacija)
    setShowLokacijaSuggestions(false)
  }

  return (
    <>
      <section className="relative overflow-hidden pt-20 pb-12 lg:pb-0">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-secondary/30" />

        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 lg:py-16">
            {/* Left content */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  <span suppressHydrationWarning>{stats.activeArtisans}+ aktivnih mojstrov po vsej Sloveniji</span>
                </span>
              </div>

              <h1 className="mt-6 font-display text-[28px] font-bold leading-tight text-foreground text-balance sm:text-5xl md:text-6xl">
                Povejte, kaj potrebujete.
                <span className="text-primary"> Mi najdemo mojstra.</span>
              </h1>

              <p className="mt-5 max-w-lg text-[15px] sm:text-lg leading-relaxed text-muted-foreground">
                Oddajte brezplačno povpraševanje in prejmite ponudbo preverjenega obrtnika v manj kot 2 urah.
              </p>

              {/* Inline Quick Form */}
              <div className="mt-8">
                <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-lg sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="border-0 shadow-none focus:ring-0 min-h-[48px] text-[16px]">
                        <SelectValue placeholder="Kaj potrebujete?" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORITVE.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="hidden h-8 w-px bg-border sm:block" />
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      inputMode="text"
                      autoComplete="address-level2"
                      placeholder="Lokacija?"
                      value={lokacijaInput}
                      onChange={(e) => handleLokacijaChange(e.target.value)}
                      onFocus={() => {
                        if (lokacijaInput.trim() && filteredLokacije.length > 0) {
                          setShowLokacijaSuggestions(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowLokacijaSuggestions(false), 200)
                      }}
                      className="border-0 shadow-none focus-visible:ring-0 min-h-[48px] text-[16px]"
                    />
                    {showLokacijaSuggestions && filteredLokacije.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
                        {filteredLokacije.map((lok) => (
                          <div
                            key={lok}
                            onClick={() => selectLokacija(lok)}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            {lok}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowForm(true)}
                    size="lg"
                    className="gap-2 sm:px-8 w-full sm:w-auto min-h-[48px]"
                  >
                    Oddajte povpraševanje
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Brezplačno
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" />
                    Odziv v 2 urah
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-primary" />
                    Brez obveznosti
                  </span>
                </div>
              </div>

              {/* Trust strip */}
              <div className="mt-8 flex flex-wrap items-center gap-6 border-t pt-6">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-foreground" suppressHydrationWarning>{stats.rating}</span>
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>iz {stats.reviews.toLocaleString()}+ ocen</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <p className="text-xs text-muted-foreground">
                  Zaupajo nam stranke iz Ljubljane, Maribora, Celja, Kopra in še 50+ mest
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href="/cenik"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Ste obrtnik? Oglejte si cenik
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right - Demonstrator */}
            <div className="relative lg:mt-0">
              <div className="relative overflow-hidden rounded-2xl min-h-[400px] sm:min-h-[500px] lg:min-h-[620px] flex items-center justify-center">
                <HeroDemonstrator />
              </div>

              <div className="absolute left-2 bottom-20 rounded-xl border bg-card p-3 shadow-xl sm:left-4 sm:bottom-24 sm:p-4 lg:-left-8">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      Pravkar zaključeno
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Prenova kopalnice - Ljubljana
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                  <span className="ml-1 text-xs text-muted-foreground">5.0</span>
                </div>
              </div>

              <div className="absolute right-2 top-6 rounded-xl border bg-card p-3 shadow-xl sm:right-4 sm:top-8 sm:p-4 lg:-right-8">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                  Ta mesec
                </p>
                <p className="font-display text-xl sm:text-2xl font-bold text-primary">
                  <span suppressHydrationWarning>{statsLoading ? '-' : stats.successfulConnections}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  uspešno povezav
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Dialog */}
      <HeroFormDialog open={showForm} onOpenChange={setShowForm} />
    </>
  )
}
