"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Search,
  MapPin,
  Star,
  Clock,
  CheckCircle,
  SlidersHorizontal,
  ArrowRight,
  Heart,
  Phone,
  Mail,
  Send,
  Shield,
  Users,
  ImageIcon,
} from "lucide-react"

// --- DATA ---

const allCraftsmen = [
  { id: 1, name: "Marko Kovacic", company: "Kovacic Vodovod s.p.", category: "Vodovod & ogrevanje", location: "Ljubljana", rating: 4.9, reviews: 87, price: "od 35 EUR/h", available: true, badge: "Top mojster", specialties: ["Centralno ogrevanje", "Talno ogrevanje", "Toplotne crpalke"], description: "Izkusen vodoinstalater z vec kot 15 leti izkusenj. Specializiran za centralno in talno ogrevanje.", gallery: 12 },
  { id: 2, name: "Ales Zupancic", company: "ElektroFix d.o.o.", category: "Elektrika & pametni sistemi", location: "Maribor", rating: 4.8, reviews: 63, price: "od 40 EUR/h", available: true, badge: "Hiter odziv", specialties: ["Pametni dom", "Elektroinstalacije", "Video nadzor"], description: "Certificiran elektricar za pametne sisteme in klasicne instalacije.", gallery: 8 },
  { id: 3, name: "Tomaz Krajnc", company: "GradPro d.o.o.", category: "Gradnja & adaptacije", location: "Celje", rating: 4.7, reviews: 112, price: "od 30 EUR/h", available: false, badge: null, specialties: ["Adaptacije", "Betonska dela", "Fasade"], description: "Gradbeno podjetje z referencami po vsej Sloveniji.", gallery: 24 },
  { id: 4, name: "Bostjan Rozman", company: "MizarRoz s.p.", category: "Mizarstvo & kovinarstvo", location: "Kranj", rating: 5.0, reviews: 41, price: "od 45 EUR/h", available: true, badge: "Top mojster", specialties: ["Kuhinje po meri", "Vgradne omare", "Stopnice"], description: "Mizar z lastno delavnico. Vse po meri, od kuhinje do stopnic.", gallery: 18 },
  { id: 5, name: "Nina Vidmar", company: "BarvaPlus d.o.o.", category: "Zakljucna dela", location: "Ljubljana", rating: 4.6, reviews: 55, price: "od 25 EUR/h", available: true, badge: null, specialties: ["Beljenje", "Tapete", "Dekorativne tehnike"], description: "Natancna in zanesljiva ekipa za vsa zakljucna dela.", gallery: 9 },
  { id: 6, name: "Gasper Hribar", company: "OknaFix s.p.", category: "Okna, vrata & sencila", location: "Koper", rating: 4.9, reviews: 29, price: "od 38 EUR/h", available: true, badge: "Hiter odziv", specialties: ["Montaza oken", "Rolete", "Komarniki"], description: "Specialist za okna in sencila z garancijo na delo.", gallery: 6 },
  { id: 7, name: "Rok Potocnik", company: "VrtArt s.p.", category: "Okolica & zunanja ureditev", location: "Novo mesto", rating: 4.5, reviews: 34, price: "od 28 EUR/h", available: true, badge: null, specialties: ["Urejanje okolice", "Tlakovanje", "Namakanje"], description: "Kreativne resitve za vas vrt in okolico.", gallery: 15 },
  { id: 8, name: "Peter Oblak", company: "ServisNaDom d.o.o.", category: "Vzdrzevanje & popravila", location: "Ljubljana", rating: 4.8, reviews: 72, price: "od 32 EUR/h", available: true, badge: "Top mojster", specialties: ["Hisnistvo", "Montaza", "Popravila"], description: "Zanesljiv servis za manjsa popravila in vzdrzevanje.", gallery: 5 },
  { id: 9, name: "Jure Horvat", company: "AquaServis d.o.o.", category: "Vodovod & ogrevanje", location: "Maribor", rating: 4.6, reviews: 43, price: "od 33 EUR/h", available: true, badge: null, specialties: ["Vodoinstaacije", "Bojlerji", "Plinski sistemi"], description: "Hiter in zanesljiv vodovodni servis za dom in podjetje.", gallery: 7 },
  { id: 10, name: "Matej Novak", company: "ElektroPro s.p.", category: "Elektrika & pametni sistemi", location: "Ljubljana", rating: 4.9, reviews: 91, price: "od 42 EUR/h", available: true, badge: "Top mojster", specialties: ["Alarmni sistemi", "Polnilnice EV", "Razsvetljava"], description: "Premium elektricni servis z najvisjo oceno v Ljubljani.", gallery: 14 },
  { id: 11, name: "Simon Zagar", company: "ZagarGrad d.o.o.", category: "Gradnja & adaptacije", location: "Ljubljana", rating: 4.8, reviews: 67, price: "od 35 EUR/h", available: true, badge: "Hiter odziv", specialties: ["Prenove kopalnic", "Suhomontaza", "Keramika"], description: "Specializirani za kompletne prenove kopalnic in stanovanj.", gallery: 21 },
  { id: 12, name: "Luka Kos", company: "KosMizar s.p.", category: "Mizarstvo & kovinarstvo", location: "Celje", rating: 4.7, reviews: 38, price: "od 40 EUR/h", available: false, badge: null, specialties: ["Kovinske konstrukcije", "Ograje", "Nadstreski"], description: "Kovinarstvo in mizarstvo z lastno proizvodnjo.", gallery: 10 },
]

const categoryOptions = [
  "Vse kategorije",
  "Gradnja & adaptacije",
  "Vodovod & ogrevanje",
  "Elektrika & pametni sistemi",
  "Mizarstvo & kovinarstvo",
  "Zakljucna dela",
  "Okna, vrata & sencila",
  "Okolica & zunanja ureditev",
  "Vzdrzevanje & popravila",
  "Poslovne storitve",
]

const ratingOptions = ["Vse ocene", "4.5+", "4.7+", "4.9+"]
const priceOptions = ["Vsi cenovni razredi", "do 30 EUR/h", "30-40 EUR/h", "40+ EUR/h"]
const ITEMS_PER_PAGE = 6

// --- CONTACT SHEET ---

function ContactSheet({
  craftsman,
  open,
  onClose,
}: {
  craftsman: (typeof allCraftsmen)[0] | null
  open: boolean
  onClose: () => void
}) {
  const [sent, setSent] = useState(false)

  if (!craftsman) return null

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {sent ? (
          <div className="flex h-full flex-col items-center justify-center text-center gap-4 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">
              Povprasevanje poslano!
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Vase povprasevanje je bilo poslano obrtiku <strong>{craftsman.name}</strong>. Pricakujte odgovor v roku 24 ur.
            </p>
            <Button onClick={onClose} className="mt-4 w-full">
              Zapri
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-xl">
                Zahtevaj ponudbo
              </SheetTitle>
              <SheetDescription>
                Posiljate povprasevanje obrtiku <strong className="text-foreground">{craftsman.name}</strong> ({craftsman.company})
              </SheetDescription>
            </SheetHeader>

            {/* Craftsman summary */}
            <div className="mt-6 flex items-center gap-4 rounded-xl border bg-muted/50 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {craftsman.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{craftsman.name}</p>
                <p className="text-xs text-muted-foreground">{craftsman.category} &middot; {craftsman.location}</p>
                <div className="mt-1 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-accent text-accent" />
                  <span className="text-xs font-medium text-foreground">{craftsman.rating}</span>
                  <span className="text-xs text-muted-foreground">({craftsman.reviews} mnenj)</span>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <form
              className="mt-6 flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault()
                setSent(true)
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="contact-name">Vase ime</Label>
                <Input id="contact-name" placeholder="Ime in priimek" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-phone">Telefonska stevilka</Label>
                <Input id="contact-phone" type="tel" placeholder="+386 XX XXX XXX" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" type="email" placeholder="vas@email.com" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-desc">Opis dela</Label>
                <Textarea
                  id="contact-desc"
                  placeholder="Opisite, kaj potrebujete (npr. zamenjava pipe v kopalnici, prenova kuhinje, montaza klimatske naprave...)"
                  rows={4}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-date">Zeleni termin</Label>
                <Input id="contact-date" type="date" />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-secondary p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Vasi podatki so varni. Obrtnik vam odgovori v 24 urah. Brez skritih stroskov ali obveznosti.
                </p>
              </div>

              <Button type="submit" className="gap-2">
                <Send className="h-4 w-4" />
                Posli povprasevanje
              </Button>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// --- SEARCH CONTENT ---

function SearchContent() {
  const searchParams = useSearchParams()
  const initialService = searchParams.get("storitev") || ""
  const initialLocation = searchParams.get("lokacija") || ""

  const [query, setQuery] = useState(initialService)
  const [location, setLocation] = useState(initialLocation)
  const [category, setCategory] = useState("Vse kategorije")
  const [ratingFilter, setRatingFilter] = useState("Vse ocene")
  const [priceFilter, setPriceFilter] = useState("Vsi cenovni razredi")
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [saved, setSaved] = useState<number[]>([])
  const [contactCraftsman, setContactCraftsman] = useState<(typeof allCraftsmen)[0] | null>(null)
  const [contactOpen, setContactOpen] = useState(false)

  const toggleSave = useCallback((id: number) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }, [])

  const filtered = useMemo(() => {
    return allCraftsmen.filter((c) => {
      const q = query.toLowerCase()
      const matchesQuery =
        !query ||
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.specialties.some((s) => s.toLowerCase().includes(q))
      const matchesLocation = !location || c.location.toLowerCase().includes(location.toLowerCase())
      const matchesCategory = category === "Vse kategorije" || c.category === category
      const matchesAvailable = !onlyAvailable || c.available

      let matchesRating = true
      if (ratingFilter === "4.5+") matchesRating = c.rating >= 4.5
      if (ratingFilter === "4.7+") matchesRating = c.rating >= 4.7
      if (ratingFilter === "4.9+") matchesRating = c.rating >= 4.9

      let matchesPrice = true
      if (priceFilter === "do 30 EUR/h") {
        const num = Number.parseInt(c.price.replace(/\D/g, ""))
        matchesPrice = num <= 30
      } else if (priceFilter === "30-40 EUR/h") {
        const num = Number.parseInt(c.price.replace(/\D/g, ""))
        matchesPrice = num >= 30 && num <= 40
      } else if (priceFilter === "40+ EUR/h") {
        const num = Number.parseInt(c.price.replace(/\D/g, ""))
        matchesPrice = num >= 40
      }

      return matchesQuery && matchesLocation && matchesCategory && matchesRating && matchesAvailable && matchesPrice
    })
  }, [query, location, category, ratingFilter, priceFilter, onlyAvailable])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <>
      <ContactSheet
        craftsman={contactCraftsman}
        open={contactOpen}
        onClose={() => {
          setContactOpen(false)
          setContactCraftsman(null)
        }}
      />

      {/* Hero CTA Header */}
      <div className="border-b bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
              Najdi zanesljivega mojstra za vas projekt
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed text-balance">
              Preglejte profile, primerjajte ocene in cene, ter zahtevajte ponudbo v manj kot 60 sekundah.
            </p>
          </div>

          {/* Mini how-it-works steps */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                1
              </div>
              <span className="text-sm font-medium text-foreground">Poisci storitev</span>
            </div>
            <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                2
              </div>
              <span className="text-sm font-medium text-foreground">Primerjaj mojstre</span>
            </div>
            <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                3
              </div>
              <span className="text-sm font-medium text-foreground">Zahtevaj ponudbo</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mx-auto mt-8 max-w-3xl">
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Kaj potrebujete? (npr. vodoinstalater, prenova...)"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setVisibleCount(ITEMS_PER_PAGE)
                  }}
                  className="border-0 pl-10 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="hidden h-8 w-px bg-border sm:block sm:self-center" />
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Lokacija (npr. Ljubljana, Maribor...)"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value)
                    setVisibleCount(ITEMS_PER_PAGE)
                  }}
                  className="border-0 pl-10 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Filters + Result Count */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "rezultat" : "rezultatov"} najdenih
            {saved.length > 0 && (
              <span className="ml-2 text-primary">
                &middot; {saved.length} shranjenih
              </span>
            )}
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">Filtri:</span>
          </div>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v)
              setVisibleCount(ITEMS_PER_PAGE)
            }}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={ratingFilter}
            onValueChange={(v) => {
              setRatingFilter(v)
              setVisibleCount(ITEMS_PER_PAGE)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ratingOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={priceFilter}
            onValueChange={(v) => {
              setPriceFilter(v)
              setVisibleCount(ITEMS_PER_PAGE)
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priceOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => {
                setOnlyAvailable(e.target.checked)
                setVisibleCount(ITEMS_PER_PAGE)
              }}
              className="rounded border-border accent-primary"
            />
            <span className="text-sm text-muted-foreground">Samo razpolozljivi</span>
          </label>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-display text-xl font-semibold text-foreground">Ni rezultatov</h3>
            <p className="mt-2 text-muted-foreground">Poskusite spremeniti iskalni niz ali filtre.</p>
            <Button
              variant="outline"
              className="mt-4 bg-transparent"
              onClick={() => {
                setQuery("")
                setLocation("")
                setCategory("Vse kategorije")
                setRatingFilter("Vse ocene")
                setPriceFilter("Vsi cenovni razredi")
                setOnlyAvailable(false)
              }}
            >
              Ponastavi filtre
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <div
                  key={c.id}
                  className="group flex flex-col rounded-2xl border bg-card transition-all hover:shadow-lg hover:border-primary/30"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between p-5 pb-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-semibold text-foreground truncate">{c.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{c.company}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSave(c.id)}
                      className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-secondary"
                      aria-label={saved.includes(c.id) ? "Odstrani iz shranjenih" : "Shrani"}
                    >
                      <Heart
                        className={`h-4 w-4 transition-colors ${
                          saved.includes(c.id)
                            ? "fill-red-500 text-red-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 px-5 pt-3">
                    {c.badge && (
                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                        {c.badge}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      <MapPin className="h-3 w-3" />
                      {c.location}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {c.available ? "Razpolozljiv" : "Zaseden"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="px-5 pt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {c.description}
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1 px-5 pt-3">
                    {c.specialties.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 px-5 pt-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <span className="font-semibold text-foreground">{c.rating}</span>
                      <span className="text-muted-foreground">({c.reviews})</span>
                    </div>
                    <span className="font-medium text-primary">{c.price}</span>
                    {c.gallery > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ImageIcon className="h-3 w-3" />
                        {c.gallery} slik
                      </span>
                    )}
                  </div>

                  {/* CTA row */}
                  <div className="mt-auto flex items-center gap-2 border-t p-4">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        setContactCraftsman(c)
                        setContactOpen(true)
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Zahtevaj ponudbo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 bg-transparent"
                      asChild
                    >
                      <a href={`tel:+38640000000`}>
                        <Phone className="h-3.5 w-3.5" />
                        <span className="sr-only">Poklic</span>
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 bg-transparent"
                      asChild
                    >
                      <a href={`mailto:info@liftgo.net?subject=Povprasevanje za ${c.name}`}>
                        <Mail className="h-3.5 w-3.5" />
                        <span className="sr-only">Email</span>
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More / Pagination */}
            {hasMore && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 bg-transparent"
                  onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                >
                  <Users className="h-4 w-4" />
                  Nalozi vec mojstrov ({filtered.length - visibleCount} preostalih)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Prikazanih {Math.min(visibleCount, filtered.length)} od {filtered.length} rezultatov
                </p>
              </div>
            )}

            {!hasMore && filtered.length > ITEMS_PER_PAGE && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Prikazanih vseh {filtered.length} rezultatov
              </p>
            )}
          </>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 rounded-2xl border bg-secondary/50 p-8 text-center lg:p-12">
          <h3 className="font-display text-xl font-bold text-foreground md:text-2xl">
            Niste nasli pravega mojstra?
          </h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Oddajte brezplacno povprasevanje in prejemite ponudbe neposredno od obrtnikov v 24 urah.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up" className="gap-2">
                Oddajte brezplacno povprasevanje
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-transparent">
              <Link href="/partner-auth/sign-up">
                Ste obrtnik? Registrirajte se
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// --- PAGE ---

export default function SearchPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="p-8 text-center text-muted-foreground">
              Nalagam...
            </div>
          }
        >
          <SearchContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
