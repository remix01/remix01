import Link from "next/link"
import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Pogoji uporabe - LiftGO",
  description: "Pogoji uporabe storitve LiftGO.",
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <h1 className="font-display text-4xl font-bold text-foreground text-balance">
              Pogoji uporabe
            </h1>
            <p className="mt-4 text-muted-foreground">
              Zadnja posodobitev: februar 2026
            </p>

            <div className="prose prose-sm mt-12 max-w-none space-y-8 text-muted-foreground dark:prose-invert">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">1. Sprejemanje pogojev</h2>
                <p>
                  Z uporabo LiftGO platforme soglašate s temi pogoji. Če se ne strinjate, prosimo, 
                  ne uporabljajte naše storitve.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">2. Uporaba storitve</h2>
                <p>
                  LiftGO je namenjena le zakoniti uporabi. Ne smete je uporabljati za nezakonite 
                  namene ali kršiti pravice tretjih oseb.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">3. Varnost računa</h2>
                <p>
                  Odgovarjate za varnost svojega računa in gesla. Vse dejavnosti na vašem računu 
                  so vaša odgovornost.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">4. Odgovornosti</h2>
                <p>
                  LiftGO je sredstvo za povezovanje. Nismo odgovorni za kakovost dela obrtnika, 
                  vendar si prizadevamo za najpopolnejšo zaščito.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">5. Plačila</h2>
                <p>
                  Vsa plačila so končna, razen v primeru vraćanja denarja skladno s to politiko. 
                  Garantiramo zaščito vašega denarni.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">6. Spremembe pogojev</h2>
                <p>
                  Правimo si pravico spremeniti te pogoje brez opozorila. Nadaljna uporaba služi 
                  kot soglasje k novim pogojem.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">7. Kontakt</h2>
                <p>
                  Če imate vprašanja o teh pogojih, nas kontaktirajte na{" "}
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
