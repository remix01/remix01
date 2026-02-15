import Link from "next/link"
import {
  Building2,
  Droplets,
  Zap,
  Hammer,
  Paintbrush,
  DoorOpen,
  TreePine,
  Wrench,
  Briefcase,
  ArrowRight,
} from "lucide-react"

const categories = [
  {
    icon: Building2,
    title: "Gradnja & adaptacije",
    services: [
      "Gradbena dela",
      "Adaptacije stanovanj",
      "Suhomontaža (knauf)",
      "Zidarska dela",
      "Betonska dela",
      "Polaganje keramike",
      "Fasade & izolacije",
      "Strehe & kleparstvo",
    ],
  },
  {
    icon: Droplets,
    title: "Vodovod & ogrevanje",
    services: [
      "Vodoinštalacije",
      "Popravilo puščanj",
      "Montaža sanitarne opreme",
      "Centralno ogrevanje",
      "Talno ogrevanje",
      "Toplotne črpalke",
      "Plinski sistemi",
      "Servis bojlerjev",
    ],
  },
  {
    icon: Zap,
    title: "Elektrika & pametni sistemi",
    services: [
      "Elektroinštalacije",
      "Menjava varovalk / napeljav",
      "Razsvetljava",
      "Pametni dom (Smart Home)",
      "Video nadzor",
      "Alarmni sistemi",
      "Polnilnice za EV",
    ],
  },
  {
    icon: Hammer,
    title: "Mizarstvo & kovinarstvo",
    services: [
      "Mizarstvo po meri",
      "Montaža kuhinj",
      "Vgradne omare",
      "Stopnice",
      "Kovinske konstrukcije",
      "Ograje & nadstreški",
      "Varjenje",
    ],
  },
  {
    icon: Paintbrush,
    title: "Zaključna dela",
    services: [
      "Beljenje",
      "Tapete",
      "Polaganje talnih oblog",
      "Parket",
      "Laminat / vinil",
      "Brušenje parketa",
    ],
  },
  {
    icon: DoorOpen,
    title: "Okna, vrata & senčila",
    services: [
      "Montaža oken",
      "Menjava vrat",
      "Rolete & žaluzije",
      "Komarniki",
      "Steklarska dela",
      "Popravila oken",
    ],
  },
  {
    icon: TreePine,
    title: "Okolica & zunanja ureditev",
    services: [
      "Urejanje okolice",
      "Tlakovanje",
      "Ograje",
      "Vrtna dela",
      "Namakalni sistemi",
      "Zimska služba",
      "Čiščenje dvorišč",
    ],
  },
  {
    icon: Wrench,
    title: "Vzdrževanje & popravila",
    services: [
      "Hišniška dela",
      "Manjša popravila",
      "Montaža pohištva",
      "Popravila po selitvi",
      "Servisi na domu",
    ],
  },
  {
    icon: Briefcase,
    title: "Poslovne storitve",
    services: [
      "Industrijsko vzdrževanje",
      "Servis poslovnih prostorov",
      "Tehnični pregledi",
      "Projektno vodenje",
      "Podizvajalska dela",
    ],
  },
]

export function Categories() {
  return (
    <section id="storitve" className="bg-muted/50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Storitve
          </p>
          <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Najdite pravega mojstra za vsako delo
          </h2>
          <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed">
            Izbirajte med preverjenimi strokovnjaki v vseh ključnih kategorijah obrtniških storitev.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.title}
              className="group flex flex-col rounded-2xl border bg-card transition-all hover:shadow-lg hover:border-primary/30"
            >
              <Link
                href={`/search?storitev=${encodeURIComponent(cat.title)}`}
                className="flex flex-col p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <cat.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {cat.title}
                  </h3>
                </div>
                
                {/* Desktop: Always show services */}
                <ul className="mt-5 hidden flex-1 flex-col gap-2 sm:flex">
                  {cat.services.map((service) => (
                    <li
                      key={service}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                      {service}
                    </li>
                  ))}
                </ul>
                
                <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  <span>Poišči mojstra</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
              
              {/* Mobile: Collapsible services */}
              <details className="sm:hidden border-t">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
                  <span>Prikaži vse storitve</span>
                  <span className="text-xs">▼</span>
                </summary>
                <ul className="flex flex-col gap-2 px-6 pb-4">
                  {cat.services.map((service) => (
                    <li
                      key={service}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                      {service}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
