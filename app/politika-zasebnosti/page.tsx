import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Politika zasebnosti - LiftGO',
  description: 'Politika zasebnosti platforme LiftGO – kako zbiramo, uporabljamo in varujemo vaše osebne podatke.',
}

export default function PolitikaZasebnostiPage() {
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
              Zadnja posodobitev: 1. januar 2026
            </p>

            <div className="prose prose-sm mt-12 max-w-none space-y-8 text-muted-foreground dark:prose-invert">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">1. Upravljavec podatkov</h2>
                <p>
                  Upravljavec osebnih podatkov je podjetje <strong>Liftgo d.o.o.</strong>, Kuraltova ulica 12,
                  4208 Šenčur, Slovenija (v nadaljevanju: &quot;LiftGO&quot; ali &quot;mi&quot;).
                  Za vprašanja v zvezi z obdelavo osebnih podatkov nas kontaktirajte na{' '}
                  <a href="mailto:info@liftgo.net" className="text-primary hover:underline">
                    info@liftgo.net
                  </a>
                  .
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">2. Kateri podatki se zbirajo</h2>
                <p>Zbiramo naslednje kategorije osebnih podatkov:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li><strong>Identifikacijski podatki:</strong> ime, priimek, e-poštni naslov, telefonska številka.</li>
                  <li><strong>Podatki o računu:</strong> geslo (hranjeno v šifrirani obliki), vloga (stranka / obrtnik).</li>
                  <li><strong>Podatki o dejavnosti:</strong> oddana povpraševanja, prejete in oddane ponudbe, sporočila.</li>
                  <li><strong>Plačilni podatki:</strong> podatki o naročnini se obdelujejo prek Stripe; LiftGO ne hrani podatkov o plačilnih karticah.</li>
                  <li><strong>Tehnični podatki:</strong> IP-naslov, vrsta brskalnika, dnevniki dostopa.</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">3. Namen in pravna podlaga obdelave</h2>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>
                    <strong>Izvajanje pogodbe (čl. 6(1)(b) GDPR):</strong> zagotavljanje storitev platforme,
                    obdelava povpraševanj in ponudb, komunikacija med strankami in obrtniki.
                  </li>
                  <li>
                    <strong>Zakonita obveznost (čl. 6(1)(c) GDPR):</strong> hramba računovodskih in davčnih
                    dokumentov v skladu z veljavno zakonodajo.
                  </li>
                  <li>
                    <strong>Zakoniti interes (čl. 6(1)(f) GDPR):</strong> preprečevanje goljufij, zagotavljanje
                    varnosti platforme, izboljšanje storitev.
                  </li>
                  <li>
                    <strong>Privolitev (čl. 6(1)(a) GDPR):</strong> pošiljanje tržnih e-sporočil (le ob vaši
                    privolitvi, ki jo lahko kadar koli prekličete).
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">4. Hramba podatkov</h2>
                <p>
                  Podatke hranimo le toliko časa, kolikor je to potrebno za uresničitev namena zbiranja
                  oziroma dokler to zahteva zakon. Podatke o računih hranimo do izbrisa računa, računovodske
                  podatke pa 10 let v skladu s slovensko zakonodajo.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">5. Delitev s tretjimi stranmi</h2>
                <p>Vaših podatkov ne prodajamo. Podatke delimo le z naslednjimi obdelovalci:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li><strong>Supabase</strong> – gostovanje baze podatkov in avtentikacija.</li>
                  <li><strong>Stripe</strong> – obdelava plačil.</li>
                  <li><strong>Vercel</strong> – gostovanje spletne aplikacije.</li>
                  <li><strong>Resend</strong> – pošiljanje transakcijskih e-sporočil.</li>
                  <li><strong>Anthropic</strong> – obdelava vnosov za AI-funkcije (anonimizirana vsebina).</li>
                </ul>
                <p className="mt-2">
                  Vsi obdelovalci so zavezani k varstvu podatkov v skladu z GDPR.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">6. Vaše pravice</h2>
                <p>V skladu z GDPR imate naslednje pravice:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li><strong>Pravica do dostopa</strong> – zahtevate lahko kopijo vaših podatkov.</li>
                  <li><strong>Pravica do popravka</strong> – zahtevate popravek netočnih podatkov.</li>
                  <li><strong>Pravica do izbrisa</strong> – v določenih primerih zahtevate izbris podatkov.</li>
                  <li><strong>Pravica do omejitve obdelave</strong> – omejite obdelavo vaših podatkov.</li>
                  <li><strong>Pravica do prenosljivosti</strong> – prejmete podatke v strojno berljivi obliki.</li>
                  <li><strong>Pravica do ugovora</strong> – ugovarjate obdelavi na podlagi zakonitega interesa.</li>
                </ul>
                <p className="mt-2">
                  Zahtevo pošljite na{' '}
                  <a href="mailto:info@liftgo.net" className="text-primary hover:underline">
                    info@liftgo.net
                  </a>
                  . Odgovorimo v 30 dneh. Če menite, da vaše pravice niso spoštovane, se lahko pritožite
                  pri{' '}
                  <a
                    href="https://www.ip-rs.si"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Informacijskem pooblaščencu RS
                  </a>
                  .
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">7. Piškotki</h2>
                <p>
                  Platforma uporablja tehnično nujne piškotke za delovanje seje in avtentikacije.
                  Analitičnih ali oglaševalskih piškotkov ne nastavljamo brez vaše privolitve.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">8. Varnost</h2>
                <p>
                  Podatke varujemo z ustreznimi tehničnimi in organizacijskimi ukrepi: šifriranje prenosa
                  (TLS), kontrola dostopa na ravni vrstic (RLS), redno varnostno kopiranje in nadzor
                  dostopa.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">9. Spremembe politike</h2>
                <p>
                  O bistvenih spremembah vas bomo obvestili po e-pošti ali z obvestilom na platformi.
                  Datum zadnje posodobitve je naveden na vrhu te strani.
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
