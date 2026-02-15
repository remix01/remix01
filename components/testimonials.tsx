import { Star, CheckCircle2, MapPin, Quote } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const customerReviews = [
  {
    name: "Matej Novak",
    location: "Ljubljana",
    role: "Lastnik stanovanja",
    service: "Prenova kopalnice",
    content: "Mojster je prišel v obljubljenih 24 urah in delo je bilo opravljeno strokovno. Kopalnica izgleda kot nova! Vročevodno cev so zamenjali brezhibno.",
    rating: 5,
    verified: true,
    date: "Januar 2026",
  },
  {
    name: "Petra Kos",
    location: "Maribor",
    role: "Podjetnica",
    service: "Električne instalacije",
    content: "Za naše poslovne prostore smo iskali zanesljivega električarja. LiftGO nas je povezal z odličnim mojstrom, ki je delo opravil hitro in čistilo.",
    rating: 5,
    verified: true,
    date: "December 2025",
  },
  {
    name: "Janez Horvat",
    location: "Celje",
    role: "Lastnik hiše",
    service: "Montaža kuhinje",
    content: "Zamenjal sem več mojstrov, ampak od zdaj samo LiftGO. Mizar je prinesel kuhinjski načrt, izvedel meritve in montiral vse v 2 dneh. Izjemna izkušnja.",
    rating: 5,
    verified: true,
    date: "December 2025",
  },
  {
    name: "Marija Janžek",
    location: "Kranj",
    role: "Upokojenka",
    service: "Popravilo vodovodne napeljave",
    content: "Cev je puščala ob večeru, do jutra je bil mojster že pri nas. Hitra, poštena in profesionalna storitev. Priporočam vsakomur!",
    rating: 5,
    verified: true,
    date: "November 2025",
  },
]

const craftsmanReviews = [
  {
    name: "Igor Božič",
    location: "Ljubljana",
    company: "BožičVodovod s.p.",
    content: "Odkar sem partner LiftGO, prejemam 40% več povpraševanj mesečno. Platforma je enostavna, stranke pa resne.",
    rating: 5,
  },
  {
    name: "Simon Golob",
    location: "Koper",
    company: "ElektroGolob d.o.o.",
    content: "Končno platforma, ki razume obrtnike. Brezplačna prijava, pošten pristop in korektne stranke. Odlično!",
    rating: 5,
  },
]

const trustNumbers = [
  { value: "4.9", label: "Povprečna ocena", suffix: "/5" },
  { value: "5000+", label: "Opravljenih del", suffix: "" },
  { value: "98%", label: "Zadovoljnih strank", suffix: "" },
  { value: "< 2 uri", label: "Povprečen čas prvega odziva", suffix: "" },
]

export function Testimonials() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Zaupajo nam
          </p>
          <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Prave zgodbe pravih ljudi
          </h2>
          <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed">
            5.000+ zadovoljnih strank in obrtnikov po vsej Sloveniji delijo svoje izkušnje.
          </p>
        </div>

        {/* Trust numbers bar */}
        <div className="mt-12 rounded-2xl border bg-card p-6 lg:p-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {trustNumbers.map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-display text-3xl font-bold text-primary">
                  {item.value}<span className="text-lg text-muted-foreground">{item.suffix}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          
          {/* Rating breakdown */}
          <div className="mt-6 border-t pt-6">
            <p className="mb-3 text-sm font-medium text-foreground">Porazdelitev ocen</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex w-16 items-center gap-0.5 text-xs">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                </div>
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-accent" style={{ width: '89%' }} />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-medium text-muted-foreground">89%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex w-16 items-center gap-0.5 text-xs">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                  <Star className="h-3 w-3 text-muted-foreground/30" />
                </div>
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-accent" style={{ width: '9%' }} />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-medium text-muted-foreground">9%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex w-16 items-center gap-0.5 text-xs">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 text-muted-foreground/30" />
                  ))}
                </div>
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-accent" style={{ width: '2%' }} />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-medium text-muted-foreground">2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer reviews */}
        <div className="mt-10">
          <h3 className="font-display text-lg font-semibold text-foreground">Mnenja strank</h3>
          
          {/* Mobile: Swipeable carousel */}
          <div className="mt-4 sm:hidden">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide [-webkit-overflow-scrolling:touch]">
              {customerReviews.map((review) => (
                <div
                  key={review.name}
                  className="flex w-[85vw] shrink-0 snap-start flex-col rounded-2xl border bg-card p-6"
                >
                  <Quote className="h-6 w-6 text-primary/20" />
                  <div className="mt-2 flex items-center gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">
                    &quot;{review.content}&quot;
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary">{review.service}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">Primer izkušnje</p>
                  <div className="mt-4 flex items-center gap-3 border-t pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {review.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-foreground">{review.name}</p>
                        {review.verified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5">
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  <span className="text-[10px] font-medium text-green-700">Preverjena stranka</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Mnenje je verificirano po opravljenem delu</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{review.role}</span>
                        <span>•</span>
                        <MapPin className="h-3 w-3" />
                        <span>{review.location}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{review.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination dots */}
            <div className="mt-4 flex justify-center gap-2">
              {customerReviews.map((_, index) => (
                <div
                  key={index}
                  className="h-2 w-2 rounded-full bg-muted-foreground/30"
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          {/* Desktop: Grid */}
          <div className="mt-4 hidden gap-6 sm:grid sm:grid-cols-2">
            {customerReviews.map((review) => (
              <div
                key={review.name}
                className="flex flex-col rounded-2xl border bg-card p-6"
              >
                <Quote className="h-6 w-6 text-primary/20" />
                <div className="mt-2 flex items-center gap-0.5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">
                  &quot;{review.content}&quot;
                </p>
                <p className="mt-2 text-xs font-medium text-primary">{review.service}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">Primer izkušnje</p>
                <div className="mt-4 flex items-center gap-3 border-t pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {review.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-foreground">{review.name}</p>
                      {review.verified && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                <span className="text-[10px] font-medium text-green-700">Preverjena stranka</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Mnenje je verificirano po opravljenem delu</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{review.role}</span>
                      <span>•</span>
                      <MapPin className="h-3 w-3" />
                      <span>{review.location}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{review.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Craftsman reviews */}
        <div className="mt-10">
          <h3 className="font-display text-lg font-semibold text-foreground">Mnenja obrtnikov</h3>
          
          {/* Mobile: Swipeable carousel */}
          <div className="mt-4 sm:hidden">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide [-webkit-overflow-scrolling:touch]">
              {craftsmanReviews.map((review) => (
                <div
                  key={review.name}
                  className="flex w-[85vw] shrink-0 snap-start flex-col rounded-2xl border border-primary/20 bg-primary/5 p-6"
                >
                  <Quote className="h-6 w-6 text-primary/30" />
                  <div className="mt-2 flex items-center gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">
                    &quot;{review.content}&quot;
                  </p>
                  <div className="mt-4 flex items-center gap-3 border-t border-primary/10 pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {review.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{review.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{review.company}</span>
                        <span>-</span>
                        <MapPin className="h-3 w-3" />
                        <span>{review.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination dots */}
            <div className="mt-4 flex justify-center gap-2">
              {craftsmanReviews.map((_, index) => (
                <div
                  key={index}
                  className="h-2 w-2 rounded-full bg-muted-foreground/30"
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          {/* Desktop: Grid */}
          <div className="mt-4 hidden gap-6 sm:grid sm:grid-cols-2">
            {craftsmanReviews.map((review) => (
              <div
                key={review.name}
                className="flex flex-col rounded-2xl border border-primary/20 bg-primary/5 p-6"
              >
                <Quote className="h-6 w-6 text-primary/30" />
                <div className="mt-2 flex items-center gap-0.5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">
                  &quot;{review.content}&quot;
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-primary/10 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {review.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{review.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{review.company}</span>
                      <span>-</span>
                      <MapPin className="h-3 w-3" />
                      <span>{review.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
