import Link from "next/link"
import type { Metadata } from "next"
import { Mail, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Kontakt - LiftGO",
  description: "Kontaktirajte LiftGO. Odgovorili vam bomo v 24 urah.",
}

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 lg:px-8">
            <h1 className="font-display text-4xl font-bold text-foreground text-balance">
              Kontaktirajte nas
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Imate vprašanja? Veseli bomo slišati od vas. Odgovorili vam bomo v 24 urah.
            </p>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border bg-card p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display font-bold text-foreground">E-pošta</h3>
                <p className="mt-2 text-muted-foreground">
                  <a href="mailto:info@liftgo.net" className="font-semibold text-primary hover:underline">
                    info@liftgo.net
                  </a>
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display font-bold text-foreground">Naslov</h3>
                <p className="mt-2 text-muted-foreground">
                  Liftgo d.o.o.<br />
                  Kuraltova ulica 12<br />
                  4208 Šenčur
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display font-bold text-foreground">Spletna stran</h3>
                <p className="mt-2 text-muted-foreground">
                  <a href="https://liftgo.net" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                    liftgo.net
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-12 rounded-2xl border bg-muted/50 p-8 text-center lg:p-12">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Povprašanje? Sporočilo?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Pošljite nam e-pošto in mi bomo poskrbeli za rešitev.
              </p>
              <Button size="lg" className="mt-6" asChild>
                <a href="mailto:info@liftgo.net">Pošlji e-pošto</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
