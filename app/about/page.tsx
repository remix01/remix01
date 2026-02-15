import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "O nas - LiftGO",
  description: "Spoznajte LiftGO - platformo, ki povezuje stranke z zanesljivimi obrtniki.",
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 lg:px-8">
            <h1 className="font-display text-4xl font-bold text-foreground text-balance">
              O LiftGO
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              LiftGO je slovenska platforma, ki povezuje stranke s preverjenimi in zanesljivimi obrtniki. 
              Naša misija je poenostaviti iskanje kvalitetnega obrtnega dela in omogočiti vsem dostop do 
              strokovnjakov, ki delajo s ponosom in transparentnostjo.
            </p>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Naša vizija</h3>
                <p className="mt-3 text-muted-foreground">
                  Biti vodilna platforma za obrtniške storitve v Sloveniji, kjer stranke in obrtniki 
                  najdejo drug drugega enostavno, zaupljivo in učinkovito.
                </p>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Naše vrednote</h3>
                <p className="mt-3 text-muted-foreground">
                  Transparentnost, zanesljivost in kakovost. Vsak projekt je posebna zgodba in vsak 
                  stranke si zasluži najbolje.
                </p>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Naša obljuba</h3>
                <p className="mt-3 text-muted-foreground">
                  24-urni odziv, pošteni ceni in sigurnost. Vaša zadovoljstvo je naša prioriteta.
                </p>
              </div>
            </div>

            <div className="mt-12 rounded-2xl border bg-muted/50 p-8 lg:p-12">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Zakaj smo nastali?
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Priče smo bili številnim zgodbam strank, ki so imele težave pri iskanju zanesljivega obrtnika. 
                Dolgi čakalni časi, nejasne cene in slaba komunikacija. Zato smo se odločili spremeniti to realnost. 
                LiftGO je rezultat leta razmisleka s stotinami obrtnikov in strank. Sistem, ki deluje za vse.
              </p>
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground">
                Imate vprašanja? Stopite v <Link href="mailto:info@liftgo.net" className="font-semibold text-primary hover:underline">stik z nami</Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
