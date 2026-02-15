import Link from "next/link"
import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Politika zasebnosti - LiftGO",
  description: "Politika zasebnosti storitve LiftGO.",
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <h1 className="font-display text-4xl font-bold text-foreground text-balance">
              Politika zasebnosti
            </h1>
            <p className="mt-4 text-muted-foreground">
              Zadnja posodobitev: februar 2026
            </p>

            <div className="prose prose-sm mt-12 max-w-none space-y-8 text-muted-foreground dark:prose-invert">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">1. Kaj podatkov zbiramo</h2>
                <p>
                  Zbiramo informacije, ki jih vnesete na naš spletni strani: ime, naslov, telefonska 
                  številka in e-naslov. Prav tako zbiramo podatke o tem, kako uporabljate LiftGO.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">2. Kako uporabljamo podatke</h2>
                <p>
                  Podatke uporabljamo za zagotavljanje storitve, izboljšanje uporabniške izkušnje, 
                  komunikacijo z vami in varnost sistema.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">3. Varnost podatkov</h2>
                <p>
                  Vaši podatki so zaščiteni s šifriranjem in drugimi varnostnimi ukrepi. Dostop 
                  imajo le avtorizirani zaposlenci.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">4. Brisanje podatkov</h2>
                <p>
                  Lahko zahtevate izbris svojih podatkov kadarkoli. Podatke obdržimo le toliko 
                  časa, kolikor je potrebno za storitev.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">5. Piškotki</h2>
                <p>
                  Uporabljamo piškotke za izboljšanje vašega doživetja. Lahko jih blokirate v 
                  nastavitvah brskalnika.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">6. Tretje osebe</h2>
                <p>
                  Vaši podatki se ne delijo s tretjimi osebami brez vaše dovoljenja, razen če 
                  je to potrebno za zagotavljanje storitve.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">7. Spremembe politike</h2>
                <p>
                  To politiko lahko spremenimo kadarkoli. Obvestili vas bomo o večjih spremembah 
                  prek e-pošte.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">8. Kontakt</h2>
                <p>
                  Če imate vprašanja o zasebnosti, nas kontaktirajte na{" "}
                  <Link href="mailto:info@liftgo.net" className="font-semibold text-primary hover:underline">
                    info@liftgo.net
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
