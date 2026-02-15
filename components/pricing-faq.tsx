"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    q: "Ali plačam, če ne dobim posla?",
    a: "Ne. Provizija se zaračuna SAMO ko je delo uspešno zaključeno in plačano. Brez posla = nič ne plačate.",
  },
  {
    q: "Kaj če se s stranko dogovorim mimo platforme?",
    a: "To je kršitev pogojev uporabe in vodi do trajne odstranitve z platforme. Vsak posel pridobljen prek LiftGO mora biti zaključen prek platforme.",
  },
  {
    q: "Lahko kadarkoli zamenjam paket?",
    a: "Da. Upgrade START → PRO je takojšen. Downgrade PRO → START velja od začetka naslednjega mesečnega cikla. Brez kazni.",
  },
  {
    q: "Kdaj se zaračuna provizija?",
    a: "Provizija se samodejno odšteje pri izplačilu. Prejmete znesek posla minus provizija. Ni predplačil niti ročnih prenosov.",
  },
  {
    q: "Kako deluje prioritetni prikaz v PRO paketu?",
    a: "PRO obrtniki se v rezultatih iskanja prikazujejo pred START obrtniki v isti regiji. Pri enaki oceni in lokaciji ima PRO vedno prednost.",
  },
  {
    q: "Ali je registracija res brezplačna?",
    a: "Da, 100%. Registracija in START paket sta brezplačna. Plačate le 10% provizijo ko uspešno zaključite posel.",
  },
]

export function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="border-t py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Pogosta vprašanja
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold text-foreground lg:text-4xl text-balance">
            Imate vprašanje glede cenika?
          </h2>
        </div>

        <div className="mt-12 flex flex-col divide-y">
          {faqs.map((faq, i) => (
            <div key={faq.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-medium text-foreground">{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
