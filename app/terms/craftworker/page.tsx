import { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pogoji uporabe za obrtnike',
  description: 'Splošni pogoji uporabe platforme LiftGO za obrtnike in mojstre.',
}

export default function CraftworkerTermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-4 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Pogoji uporabe za obrtnike
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Verzija 2026-02-v1 • Veljavno od 15. februarja 2026
              </p>
            </div>

            <div className="prose prose-slate max-w-none dark:prose-invert">
              <div className="rounded-lg bg-muted/50 p-6 mb-8">
                <h2 className="text-xl font-semibold text-foreground mt-0">Pregled</h2>
                <p className="text-muted-foreground">
                  Ti pogoji urejajo uporabo platforme LiftGO (v nadaljevanju: &quot;Platforma&quot;) 
                  za obrtnike, mojstre in ponudnike storitev (v nadaljevanju: &quot;Obrtnik&quot; ali &quot;Vi&quot;).
                </p>
              </div>

              <h2 className="text-2xl font-bold text-foreground mt-12">§1 Definicije</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">1.1 Platforma</dt>
                  <dd className="text-muted-foreground ml-4">
                    Spletna platforma LiftGO, dostopna na www.liftgo.net, ki povezuje stranke z obrtniki.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">1.2 Posel</dt>
                  <dd className="text-muted-foreground ml-4">
                    Vsako delo ali storitev, dogovorjena med Obrtnikom in Stranko prek Platforme.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">1.3 Mojster/Obrtnik</dt>
                  <dd className="text-muted-foreground ml-4">
                    Samostojni podjetnik ali podjetje, registrirano za opravljanje obrtniških storitev.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">1.4 Stranka</dt>
                  <dd className="text-muted-foreground ml-4">
                    Uporabnik Platforme, ki išče obrtnika za izvedbo del ali storitev.
                  </dd>
                </div>
              </dl>

              <h2 className="text-2xl font-bold text-foreground mt-12">§2 Provizija in plačila</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  <strong>2.1 Paket START:</strong> Obrtnik plača provizijo v višini <strong className="text-foreground">10%</strong> od 
                  skupne vrednosti posla, doseženega prek Platforme.
                </p>
                <p className="text-muted-foreground">
                  <strong>2.2 Paket PRO:</strong> Obrtnik plača provizijo v višini <strong className="text-foreground">5%</strong> od 
                  skupne vrednosti posla, doseženega prek Platforme.
                </p>
                <p className="text-muted-foreground">
                  <strong>2.3 Plačilni pogoji:</strong> Provizija se obračuna in zadrži ob plačilu Stranke. 
                  Po potrditvi opravljenega dela se preostali znesek (po odbitku provizije) nakaže na Obrtnikov račun.
                </p>
                <p className="text-muted-foreground">
                  <strong>2.4 Transparentnost:</strong> Provizija je jasno navedena na vsakem računu in ponudbi.
                </p>
              </div>

              <div className="my-12 rounded-lg border-2 border-red-500/50 bg-red-500/10 p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mt-0">
                      §3 PREPOVED DIREKTNEGA DOGOVARJANJA
                    </h2>
                    
                    <p className="text-foreground mt-4 font-semibold">
                      3.1 Obrtnik se zavezuje, da:
                    </p>
                    <ul className="list-disc ml-6 mt-2 space-y-2 text-muted-foreground">
                      <li>
                        <strong className="text-foreground">Ne bo kontaktiral Stranke zunaj Platforme LiftGO</strong> pred, med ali po 
                        prvem stiku, dokler ni opravljen prvi posel prek Platforme in plačana provizija.
                      </li>
                      <li>
                        <strong className="text-foreground">Ne bo delil osebnih kontaktnih podatkov</strong> (telefonska številka, 
                        e-pošta, WhatsApp, Viber, SMS) s Stranko prek platformske komunikacije.
                      </li>
                      <li>
                        <strong className="text-foreground">Ne bo poskušal pridobiti kontaktnih podatkov</strong> Stranke za namen 
                        izogibanja plačilu provizije.
                      </li>
                    </ul>

                    <p className="text-foreground mt-6 font-semibold">
                      3.2 Sankcije za kršitev:
                    </p>
                    <ol className="list-decimal ml-6 mt-2 space-y-3 text-muted-foreground">
                      <li>
                        <strong className="text-foreground">1. kršitev:</strong> Pisni opomin in opozorilo. 
                        Kršitev je zabeležena v sistemu.
                      </li>
                      <li>
                        <strong className="text-foreground">2. kršitev:</strong> Začasna suspenzija računa za 
                        7 dni. Obrtnik ne more prejemati novih povpraševanj.
                      </li>
                      <li>
                        <strong className="text-foreground">3. kršitev ali resna kršitev:</strong> Trajna 
                        izključitev iz Platforme brez možnosti ponovne registracije.
                      </li>
                    </ol>

                    <p className="text-red-600 dark:text-red-400 mt-6 font-semibold">
                      3.3 Posledice trajne izključitve:
                    </p>
                    <ul className="list-disc ml-6 mt-2 space-y-2 text-muted-foreground">
                      <li>
                        Obrtnik <strong className="text-foreground">izgubi vse ocene, reference in zgodovino 
                        opravljenih del</strong> na Platformi.
                      </li>
                      <li>
                        Profil je trajno odstranjen in ni možna ponovna registracija z istim matično številko ali 
                        osebnimi podatki.
                      </li>
                      <li>
                        Obrtnik ne more zahtevati vračila plačanih članarin ali provizij.
                      </li>
                    </ul>

                    <p className="text-foreground mt-6 font-semibold">
                      3.4 Razlog za prepoved:
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Platforma LiftGO zagotavlja zaupanje, zaščito plačil, zavarovanje, reševanje sporov in 
                      verifikacijo obrtnikov. Direktno dogovarjanje izničuje te koristi za Stranke in ogroža 
                      poslovni model Platforme. Provizija je plačilo za te storitve in dostop do verificiranih Strank.
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-foreground mt-12">§4 Garancija odziva in zavarovanje</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  <strong>4.1 Garancija odziva:</strong> LiftGO garantira Strankam odziv verificiranega obrtnika 
                  v roku 2 ur. Ta garancija velja <strong className="text-foreground">samo za posle, dogovorjene prek Platforme</strong>.
                </p>
                <p className="text-muted-foreground">
                  <strong>4.2 Zavarovanje odgovornosti:</strong> Vsi obrtniki na Platformi imajo zavarovanje 
                  odgovornosti. V primeru sporov ali škode, LiftGO posreduje in pomaga pri reševanju. 
                  Ta zaščita <strong className="text-foreground">ne velja za posle, sklenjene zunaj Platforme</strong>.
                </p>
                <p className="text-muted-foreground">
                  <strong>4.3 Ocenjevanje:</strong> Po opravljenem delu Stranka oceni Obrtnika. Te ocene 
                  gradijo zaupanje in povečujejo prihodnja povpraševanja.
                </p>
              </div>

              <h2 className="text-2xl font-bold text-foreground mt-12">§5 Zasebnost in komunikacija</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  <strong>5.1 Platforma za komunikacijo:</strong> Vsa komunikacija med Obrtnikom in Stranko 
                  poteka prek varnega sistema sporočil LiftGO, ki varuje podatke obeh strani.
                </p>
                <p className="text-muted-foreground">
                  <strong>5.2 Odklepanje kontakta:</strong> Po opravljenem prvem plačilu in potrditvi posla 
                  se kontaktni podatki (telefon, e-pošta) samodejno odklenejo za nadaljnje sodelovanje.
                </p>
                <p className="text-muted-foreground">
                  <strong>5.3 Zasebnost:</strong> LiftGO ne deli kontaktnih podatkov Obrtnika s tretjimi osebami 
                  brez izrecnega soglasja.
                </p>
                <p className="text-muted-foreground">
                  <strong>5.4 Avtomatsko zaznavanje kršitev:</strong> Sistem LiftGO uporablja avtomatizirano 
                  analizo sporočil za zaznavanje deljenja kontaktnih podatkov in poskusov obida provizije. 
                  Sporočila, ki kršijo pravila, so samodejno blokirana.
                </p>
              </div>

              <h2 className="text-2xl font-bold text-foreground mt-12">§6 Spremembe pogojev</h2>
              <p className="text-muted-foreground">
                LiftGO si pridržuje pravico do spremembe teh pogojev. O spremembah bodo Obrtniki obveščeni 
                najmanj 30 dni vnaprej prek e-pošte. Nadaljnja uporaba Platforme po uveljavitvi novih pogojev 
                pomeni sprejetje sprememb.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-12">§7 Kontakt</h2>
              <p className="text-muted-foreground">
                Za vprašanja ali pojasnila glede teh pogojev nas kontaktirajte na:
              </p>
              <div className="bg-muted/30 rounded-lg p-4 mt-4">
                <p className="text-foreground font-semibold">Liftgo d.o.o.</p>
                <p className="text-muted-foreground">Kuraltova ulica 12, 4208 Šenčur</p>
                <p className="text-muted-foreground">E-pošta: info@liftgo.net</p>
                <p className="text-muted-foreground">Matična št.: 9724346000</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
