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
                <h2 className="font-display text-2xl font-bold text-foreground">1. Splošno</h2>
                <p>
                  Ti splošni pogoji uporabe (v nadaljevanju: <strong>»Pogoji«</strong>) urejajo pravice in obveznosti 
                  med podjetjem <strong>Liftgo d.o.o.</strong>, Kuraltova ulica 12, 4208 Šenčur, 
                  matična številka: 9724346000, ID za DDV: SI24728381 (v nadaljevanju: <strong>»LiftGO«</strong>), 
                  in uporabniki platforme{" "}
                  <Link href="/" className="text-primary underline">www.liftgo.net</Link>{" "}
                  (v nadaljevanju: <strong>»Platforma«</strong>).
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">2. Uporabniki platforme</h2>
                <p>Uporabniki Platforme so:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li><strong>Stranke</strong> — fizične ali pravne osebe, ki oddajo povpraševanja</li>
                  <li><strong>Obrtniki (partnerji)</strong> — registrirani podjetniki, ki opravljajo storitve</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">3. Oddaja povpraševanja</h2>
                <h3 className="mt-4 text-lg font-semibold text-foreground">3.1 Postopek</h3>
                <p>
                  Stranka odda povpraševanje preko obrazca. Povpraševanje mora vsebovati: 
                  vrsto storitve, lokacijo, opis dela in kontaktne podatke.
                </p>
                <h3 className="mt-4 text-lg font-semibold text-foreground">3.2 Brezplačnost</h3>
                <p>
                  Oddaja povpraševanja je za stranke <strong>popolnoma brezplačna</strong>. 
                  Stranka plača samo opravljeno delo neposredno obrtniku.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">4. Registracija obrtnikov</h2>
                <h3 className="mt-4 text-lg font-semibold text-foreground">4.1 Pogoji</h3>
                <p>Obrtnik mora imeti:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Veljavno dovoljenje za opravljanje dejavnosti</li>
                  <li>Sklenjeno zavarovanje odgovornosti</li>
                  <li>Vse zahtevane podatke (matična, davčna številka)</li>
                </ul>
                <h3 className="mt-4 text-lg font-semibold text-foreground">4.2 Prepoved obhajanja platforme</h3>
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                  <p className="font-semibold text-foreground">
                    Obrtnik se zavezuje, da ne bo poskušal obiti platforme z dogovarjanjem izven sistema.
                  </p>
                </div>
                <p className="mt-4">V primeru kršitve ima LiftGO pravico:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Zaračunati pogodbeno kazen</li>
                  <li>Suspendirati obrtnikov račun</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">5. Varovanje osebnih podatkov</h2>
                <p>
                  LiftGO obdeluje osebne podatke v skladu z GDPR in ZVOP-2. 
                  Podrobnosti v{" "}
                  <Link href="/privacy" className="text-primary underline">Politiki zasebnosti</Link>.
                </p>
                <p className="mt-4">Za uveljavljanje pravic:{" "}
                  <Link href="mailto:info@liftgo.net" className="text-primary underline">info@liftgo.net</Link>
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">6. Omejitev odgovornosti</h2>
                <p>
                  LiftGO nastopa kot <strong>posrednik</strong>. Ne prevzema odgovornosti za kakovost storitev, 
                  roke izvedbe ali škodo pri opravljanju storitev.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">7. Kontaktni podatki</h2>
                <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
                  <p className="font-semibold text-foreground">Liftgo d.o.o.</p>
                  <p>Kuraltova ulica 12, 4208 Šenčur, Slovenija</p>
                  <p>Matična številka: 9724346000</p>
                  <p>ID za DDV: SI24728381</p>
                  <p className="mt-2">
                    E-pošta: <Link href="mailto:info@liftgo.net" className="text-primary underline">info@liftgo.net</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
