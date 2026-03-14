import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import Link from 'next/link'

const pricingPlans = [
  {
    name: 'START',
    price: '0€',
    period: '/mesec',
    description: 'Idealno za začetnike',
    features: [
      'Do 20 ponudb na mesec',
      'Osnovni profil',
      '10% provizija od zaslužka',
      'Email podporo',
      'Osnovne statistike',
    ],
    notIncluded: [
      'Prednostni prikaz',
      'Napredna analitika',
      'Direktna komunikacija s strankami',
      'Certification badge',
    ],
    cta: 'Začni zdaj',
    highlighted: false,
  },
  {
    name: 'PRO',
    price: '29€',
    period: '/mesec',
    description: 'Priporočeno za aktivne mojstre',
    features: [
      'Neomejene ponudbe',
      'Prednostni prikaz',
      '5% provizija od zaslužka',
      'Prioritetna podpora (24/7)',
      'Napredne statistike',
      'Direktna komunikacija',
      'Certification badge',
      'Marketing alati',
      'Planiranje urnika',
    ],
    notIncluded: [],
    cta: 'Nadgradi na PRO',
    highlighted: true,
  },
  {
    name: 'PREMIUM',
    price: 'Po dogovoru',
    period: '',
    description: 'Za velike timove in agencije',
    features: [
      'Vse PRO funkcionalnosti',
      'Prilagojeni pogodbi',
      'Ded namenski manager',
      'API dostop',
      'Integracije s sistemi',
      'Lastni branding',
      'Mesečna analiza',
    ],
    notIncluded: [],
    cta: 'Kontaktiraj nas',
    highlighted: false,
  },
]

const features = [
  {
    title: 'Enostavna registracija',
    description: 'Registracija traja le nekaj minut. Napolnite profil in začnite prejemati ponudbe.',
  },
  {
    title: 'Zaščita plačil',
    description: 'Vsa plačila so zaščitena. Denar prejete samo ko je delo opravljeno in potrjeno.',
  },
  {
    title: 'Preverjeni obrtniki',
    description: 'Sistem preverke zagotavlja, da so le kvalitetni obrtniki dostopni na platformi.',
  },
  {
    title: '24/7 Podpora',
    description: 'Naš tim je vedno tu, da vam pomaga z vprašanji ali težavami.',
  },
  {
    title: 'Fleksibilen urnik',
    description: 'Izberite lastne ure dela in upravljajte svoj razpored.',
  },
  {
    title: 'Transparentne provizije',
    description: 'Vedite točno koliko zaslužite. Brez skritih stroškov.',
  },
]

export default function PricingPage() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-12 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Pregledna in poštena cenitev
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Izberite paket, ki se ujema z vašim poslovanjem
          </p>
          <p className="text-sm text-muted-foreground">
            Brez skritih stroškov. Odpovedate se lahko kadarkoli.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col p-8 ${
                  plan.highlighted
                    ? 'border-primary border-2 shadow-lg scale-105'
                    : 'border-border'
                }`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Najpopularnejši
                  </Badge>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <Link href="/partner-auth/sign-up" className="mb-8">
                  <Button className="w-full" variant={plan.highlighted ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </Link>

                {/* Features */}
                <div className="space-y-4 flex-1">
                  <h4 className="font-semibold text-foreground">Vključeno:</h4>
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}

                  {plan.notIncluded.length > 0 && (
                    <>
                      <h4 className="font-semibold text-foreground mt-6">Ni vključeno:</h4>
                      {plan.notIncluded.map((feature) => (
                        <div key={feature} className="flex gap-3 opacity-60">
                          <span className="w-5 h-5 flex-shrink-0 mt-0.5">-</span>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Kaj dobite v vsakem paketu
            </h2>
            <p className="text-muted-foreground mt-2">
              Sve osnovne funkcionalnosti so dostopne v vseh paketih
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="p-6">
                <div className="mb-3 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Pogosto postavljena vprašanja
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'Ali je mogoče paket spremeniti kadarkoli?',
                a: 'Da! Lahko se kadarkoli nadgradite na PRO paket ali se vrnete na START. Spremembe se uveljavijo takoj.',
              },
              {
                q: 'Kaj se zgodi, če sem nezadovoljan?',
                a: 'Lahko se odpovedate kadarkoli brez penalizacije. Ni dolgoročnih pogodb.',
              },
              {
                q: 'Ali obstajajo dodatni stroški?',
                a: 'Ne, samo provizija od zaslužka, ki je vključena v ceno paketa. Nobenih skritih stroškov.',
              },
              {
                q: 'Kako se izračuna provizija?',
                a: 'Provizija se obračuna od vrednosti opravljenega dela. Obračunava se avtomatsko in vam je prikazana v detajlih.',
              },
            ].map((item, i) => (
              <Card key={i} className="p-6">
                <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Pripravljen za začetek?
          </h2>
          <p className="text-muted-foreground mb-8">
            Pridružite se tisočem obrtnikov, ki že zaslužujejo prek LiftGO
          </p>
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <Link href="/partner-auth/sign-up">
              <Button size="lg">Registracija - BREZPLAČNO</Button>
            </Link>
            <Link href="/iskanje">
              <Button size="lg" variant="outline">Najdi del</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
