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
              Zadnja posodobitev: 15. februar 2026
            </p>

            <div className="prose prose-sm mt-12 max-w-none space-y-8 text-muted-foreground dark:prose-invert">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">1. Splošne določbe</h2>
                <p>
                  Ti splošni pogoji uporabe urejajo dostop in uporabo spletne platforme LiftGO, ki jo upravlja:
                </p>
                <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
                  <p className="font-semibold text-foreground">Liftgo d.o.o.</p>
                  <p>Kuraltova ulica 12, 4208 Šenčur, Slovenija</p>
                  <p>Matična številka: 9724346000</p>
                  <p>ID za DDV: SI24728381</p>
                  <p>E-pošta: info@liftgo.net</p>
                </div>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">2. Storitve platforme</h2>
                <p>
                  LiftGO je platforma, ki povezuje stranke z verificiranimi obrtniki v Sloveniji. Omogočamo 
                  oddajo brezplačnega povpraševanja, prejemanje ponudb preverjenikov obrtnikov, komunikacijo 
                  in ocenjevanje opravljenih storitev.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">3. Obveznosti uporabnikov</h2>
                <p className="font-medium text-foreground">Za stranke:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Posredovanje resničnih in točnih podatkov pri oddaji povpraševanj</li>
                  <li>Spoštovanje dogovorjenih terminov in plačilnih obveznosti</li>
                  <li>Pošteno ocenjevanje opravljenih storitev</li>
                </ul>
                <p className="mt-4 font-medium text-foreground">Za obrtnike:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Posredovanje realnih ponudb in spoštovanje ponujenih cen</li>
                  <li>Strokovno opravljanje storitev v dogovorjenem roku</li>
                  <li>Posedovanje ustreznih dovoljenj in zavarovanja</li>
                  <li>Spoštovanje Zakona o varstvu potrošnikov in drugih predpisov</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">4. Plačila in provizija</h2>
                <p>
                  Za stranke je uporaba platforme popolnoma brezplačna. Obrtniki plačujejo provizijo od 
                  zaključenih del skladno s cenovnim načrtom na <Link href="/cenik" className="text-primary underline">liftgo.net/cenik</Link>.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">5. Omejitev odgovornosti</h2>
                <p>
                  LiftGO nastopa kot posrednik med strankami in obrtniki. Nismo odgovorni za kakovost 
                  opravljenih storitev, spore med stranko in obrtinkom ali škodo nastalo med izvedbo. 
                  Vsi obrtniki morajo imeti veljavno zavarovanje odgovornosti.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">6. Intelektualna lastnina</h2>
                <p>
                  Vse vsebine na platformi LiftGO so last Liftgo d.o.o. ali licenčno uporabljene. 
                  Prepovedano je kopiranje ali distribucija brez pisnega soglasja.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">7. Spremembe pogojev</h2>
                <p>
                  Pridržujemo si pravico do spremembe teh pogojev. Vse spremembe bodo objavljene na tej strani 
                  z navedbo datuma posodobitve. Nadaljnja uporaba platforme pomeni sprejemanje novih pogojev.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">8. Veljavna zakonodaja</h2>
                <p>
                  Ti pogoji se urejajo po pravu Republike Slovenije. Vsi spori se rešujejo pred pristojnim 
                  sodiščem v Ljubljani, Slovenija.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">9. Kontakt</h2>
                <p>
                  Za vprašanja glede teh pogojev nas kontaktirajte na{" "}
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
