import { UserPlus, ShieldCheck, Bell, Banknote } from "lucide-react"

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Brezplačna registracija",
    time: "2 minuti",
    description:
      "Izpolnite kratek obrazec, dodajte storitve in lokacije. Brez naročnine, brez obveznosti.",
  },
  {
    icon: ShieldCheck,
    step: "02",
    title: "Preverjanje in potrditev profila",
    time: "Do 24 ur",
    description:
      "Preverimo vašo identiteto, reference in zavarovanje. Po potrditvi prejmete badge 'Preverjen mojster'.",
  },
  {
    icon: Bell,
    step: "03",
    title: "Začnete prejemati povpraševanja",
    time: "Takoj po potrditvi",
    description:
      "Povpraševanja strank iz vaše regije prihajajo neposredno. Izberite posle, ki vam ustrezajo.",
  },
  {
    icon: Banknote,
    step: "04",
    title: "Opravite delo, prejmete plačilo",
    time: "Po zaključku",
    description:
      "Delo opravite, stranka plača. Provizija se obračuna samo po uspešno zaključenem poslu.",
  },
]

export function CraftsmanHowItWorks() {
  return (
    <section className="py-20 lg:py-28 border-t">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Kako deluje za obrtnike
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl text-balance">
            Od registracije do prvega posla v 4 korakih
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Preprost postopek brez papirologije in čakalnih vrst.
          </p>
        </div>

        <div className="relative mt-14">
          {/* Connector line (desktop only) */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-border lg:block" />

          <div className="grid gap-8 lg:gap-0">
            {steps.map((step, idx) => (
              <div
                key={step.step}
                className={`relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12 ${
                  idx % 2 === 1 ? "lg:flex-row-reverse" : ""
                } ${idx > 0 ? "lg:mt-8" : ""}`}
              >
                {/* Card */}
                <div className="flex-1 rounded-2xl border bg-card p-6 lg:p-8">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary">Korak {step.step}</p>
                      <h3 className="font-display text-lg font-bold text-foreground">{step.title}</h3>
                    </div>
                  </div>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{step.description}</p>
                  <p className="mt-3 text-xs font-medium text-primary">{step.time}</p>
                </div>

                {/* Center dot (desktop only) */}
                <div className="absolute left-1/2 hidden h-4 w-4 -translate-x-1/2 rounded-full border-2 border-primary bg-background lg:block" />

                {/* Spacer for alternating sides */}
                <div className="hidden flex-1 lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
