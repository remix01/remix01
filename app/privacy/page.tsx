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
              Zadnja posodobitev: 15. februar 2026
            </p>

            <div className="prose prose-sm mt-12 max-w-none space-y-8 text-muted-foreground dark:prose-invert">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">1. Upravljavec osebnih podatkov</h2>
                <p>Upravljavec vaših osebnih podatkov je:</p>
                <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
                  <p className="font-semibold text-foreground">Liftgo d.o.o.</p>
                  <p>Kuraltova ulica 12, 4208 Šenčur, Slovenija</p>
                  <p>Matična številka: 9724346000</p>
                  <p>ID za DDV: SI24728381</p>
                  <p>E-pošta: info@liftgo.net</p>
                </div>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">2. Katere osebne podatke zbiramo</h2>
                <p className="font-medium text-foreground">Podatki strank:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Ime in priimek, e-poštni naslov, telefonska številka</li>
                  <li>Lokacija storitve, opis povpraševanja</li>
                  <li>Fotografije ali video posnetki (če jih stranke posredujejo)</li>
                </ul>
                <p className="mt-4 font-medium text-foreground">Podatki obrtnikov:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Ime in priimek ali naziv podjetja</li>
                  <li>Davčna in matična številka</li>
                  <li>E-poštni naslov, telefonska številka, naslov sedeža</li>
                  <li>Identifikacijski dokumenti, certifikati, bančni račun</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">3. Namen obdelave podatkov</h2>
                <p>Osebne podatke obdelujemo za:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Povezovanje strank z obrtniki</li>
                  <li>Komunikacijo (obvestila, ponudbe, potrditve)</li>
                  <li>Verifikacijo obrtnikov</li>
                  <li>Obdelavo plačil in provizij</li>
                  <li>Izboljšanje storitev in varnost</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">4. Pravna podlaga</h2>
                <p>Podatke obdelujemo na podlagi:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Privolitve (člen 6(1)(a) GDPR)</li>
                  <li>Izvajanja pogodbe (člen 6(1)(b) GDPR)</li>
                  <li>Zakonskih obveznosti (člen 6(1)(c) GDPR)</li>
                  <li>Legitimnih interesov (člen 6(1)(f) GDPR)</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">5. Posredovanje tretjim osebam</h2>
                <p>Vaše osebne podatke lahko posredujemo:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Obrtinikom (ko oddate povpraševanje)</li>
                  <li>Plačilnim ponudnikom (Stripe)</li>
                  <li>Email ponudnikom (Resend)</li>
                  <li>Oblačnim storitvam (Supabase, Vercel)</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">6. Hranjenje podatkov</h2>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Podatke strank: do 3 leta po zaključku storitve</li>
                  <li>Podatke obrtnikov: do prenehanja + 5 let</li>
                  <li>Finančne podatke: 10 let (davčni zakon)</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">7. Vaše pravice po GDPR</h2>
                <p>Imate pravico do:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Dostopa do vaših osebnih podatkov</li>
                  <li>Popravka netočnih podatkov</li>
                  <li>Izbrisa podatkov (&quot;pravica do pozabe&quot;)</li>
                  <li>Omejitve obdelave</li>
                  <li>Prenosljivosti podatkov</li>
                  <li>Ugovora obdelavi za neposredno trženje</li>
                  <li>Preklica privolitve</li>
                </ul>
                <p className="mt-4">
                  Za uveljavljanje pravic nas kontaktirajte na{" "}
                  <Link href="mailto:info@liftgo.net" className="text-primary underline">info@liftgo.net</Link>.
                  Odgovorili vam bomo v 30 dneh.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">8. Piškotki (Cookies)</h2>
                <p>Uporabljamo:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Nujne piškotke (potrebni za delovanje)</li>
                  <li>Funkcijske piškotke (shranjevanje nastavitev)</li>
                  <li>Analitične piškotke (merjenje obiska)</li>
                  <li>Trženjske piškotke (prilagojeni oglasi)</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">9. Varnost podatkov</h2>
                <p>Za zaščito podatkov uporabljamo:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>SSL/TLS šifriranje podatkov v prenosu</li>
                  <li>Šifriranje občutljivih podatkov v bazi</li>
                  <li>Dvofaktorsko avtentikacijo</li>
                  <li>Omejitev dostopa le pooblaščenim osebam</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">10. Kontakt in pritožbe</h2>
                <p>
                  Za vprašanja ali pritožbe nas kontaktirajte na{" "}
                  <Link href="mailto:info@liftgo.net" className="font-semibold text-primary hover:underline">
                    info@liftgo.net
                  </Link>
                </p>
                <p className="mt-4">
                  Pritožbo lahko vložite pri Informacijskem pooblaščencu RS:{" "}
                  <a href="https://www.ip-rs.si" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    www.ip-rs.si
                  </a>
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
