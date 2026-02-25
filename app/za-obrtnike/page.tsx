import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  TrendingUp,
  UserPlus,
  ShieldCheck,
  Bell,
  Banknote,
  CheckCircle,
  Clock,
  Target,
  Users,
  Star,
  Zap,
  Phone,
  Mail
} from 'lucide-react'
import Link from 'next/link'
import { HeroImage } from '@/components/hero-image'

export default function ZaObrtnike() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 px-4 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left - Content */}
              <div className="flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-sm font-medium w-fit">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>Za obrtnike po vsej Sloveniji</span>
                </div>

                <h1 className="mt-6 font-display text-[28px] font-bold leading-tight text-foreground text-balance sm:text-5xl md:text-6xl">
                  Povečajte svoje naročila.
                  <span className="text-primary"> Brez mesečnih stroškov.</span>
                </h1>

                <p className="mt-5 max-w-lg text-[15px] sm:text-lg leading-relaxed text-muted-foreground">
                  Pridružite se 225+ verificiranim mojstrom in obrtniško podjetjem. Plačate samo provizijo ob uspešno zaključenem delu.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button size="lg" className="gap-2 w-full sm:w-auto min-h-[48px]" asChild>
                    <Link href="/partner-auth/sign-up">
                      Začnite brezplačno
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto min-h-[48px]" asChild>
                    <Link href="/cenik">Oglejte si cenik</Link>
                  </Button>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  Že imate račun?{' '}
                  <Link href="/partner-auth/login" className="text-blue-600 hover:underline font-medium">
                    Prijavite se →
                  </Link>
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Brez vezave
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Registracija v 5 min
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    0 EUR mesečno
                  </span>
                </div>
              </div>

              {/* Right - Image */}
              <div className="relative lg:mt-0">
                <div className="relative overflow-hidden rounded-2xl min-h-[400px] sm:min-h-[500px] lg:min-h-[620px]">
                  <HeroImage className="h-[400px] w-full rounded-2xl object-cover sm:h-[500px] lg:h-[620px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
                </div>

                <div className="absolute left-2 bottom-20 rounded-xl border bg-card p-3 shadow-xl sm:left-4 sm:bottom-24 sm:p-4 lg:-left-8">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-foreground">+40% več naročil</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">povprečen partner</p>
                    </div>
                  </div>
                </div>

                <div className="absolute right-2 top-6 rounded-xl border bg-card p-3 shadow-xl sm:right-4 sm:top-8 sm:p-4 lg:-right-8">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Povprečen odziv</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-primary">{'< 2 uri'}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">do prvega kontakta</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Kako deluje
              </p>
              <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
                Do novih naročil v 4 preprostih korakih
              </h2>
              <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed">
                Enostavna registracija, brez skritih stroškov. Začnite prejemati povpraševanja še danes.
              </p>
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  number: 1,
                  icon: UserPlus,
                  title: "Brezplačna registracija",
                  description: "Ustvarite profil v 5 minutah. Brez mesečnih stroškov ali vezave."
                },
                {
                  number: 2,
                  icon: ShieldCheck,
                  title: "Verifikacija",
                  description: "Preverimo vaše reference in dokumentacijo za večje zaupanje strank."
                },
                {
                  number: 3,
                  icon: Bell,
                  title: "Prejemate povpraševanja",
                  description: "Stranke iz vaše regije in stroke. Izbirate samo dela, ki vas zanimajo."
                },
                {
                  number: 4,
                  icon: Banknote,
                  title: "Plačate provizijo",
                  description: "Provizija samo ob zaključeni storitvi. Brez skritih stroškov."
                }
              ].map((step, index) => (
                <div key={step.number} className="relative">
                  <div className="flex flex-col gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {index < 3 && (
                    <div className="absolute -right-4 top-7 hidden h-0.5 w-8 bg-primary/20 lg:block" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <Button size="lg" asChild className="w-full sm:w-auto min-h-[48px]">
                <Link href="/partner-auth/sign-up">
                  Začnite brezplačno
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-28 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Cenik
              </p>
              <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
                Plačaš samo, ko zaslužiš
              </h2>
              <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed">
                Brez vezav in drobnega tiska. Izberite paket, ki vam ustreza.
              </p>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
              {/* START Package */}
              <Card className="relative overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-foreground">START</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Za začetek in testiranje</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-5xl font-bold text-foreground">0 EUR</span>
                      <span className="text-muted-foreground">/mesec</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-primary">Provizija: 10% na zaključeno delo</p>
                  </div>

                  <ul className="mt-8 flex flex-col gap-3">
                    {[
                      "Brezplačna registracija",
                      "Povpraševanja iz vaše regije",
                      "LiftGO garancija plačila",
                      "Osnovna podpora",
                      "Profil na platformi"
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button size="lg" variant="outline" className="mt-8 w-full min-h-[48px]" asChild>
                    <Link href="/partner-auth/sign-up">Začnite zdaj</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* PRO Package */}
              <Card className="relative overflow-hidden border-primary/50 bg-primary/5">
                <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Priporočeno
                </div>
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-foreground">PRO</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Za profesionalce</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-5xl font-bold text-primary">29 EUR</span>
                      <span className="text-muted-foreground">/mesec</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-primary">Provizija: 5% na zaključeno delo</p>
                  </div>

                  <ul className="mt-8 flex flex-col gap-3">
                    {[
                      "Vse iz START paketa",
                      "50% nižja provizija (5%)",
                      "Prednostna pozicija v rezultatih",
                      "Premium podpora (24/7)",
                      "Mesečna analitika in statistika",
                      "Več povpraševanj"
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button size="lg" className="mt-8 w-full min-h-[48px]" asChild>
                    <Link href="/partner-auth/sign-up">Začnite zdaj</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Prednosti
              </p>
              <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
                Zakaj se pridružiti LiftGO?
              </h2>
              <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed">
                Več kot 225 obrtnikov že uporablja LiftGO za rast svojega poslovanja.
              </p>
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Target,
                  title: "Kvalitetna povpraševanja",
                  description: "Samo resne stranke iz vaše regije in stroke. Brez spam povpraševanj."
                },
                {
                  icon: Clock,
                  title: "Prihranite čas",
                  description: "Ne izgubljajte časa z iskanjem strank. Stranke pridejo k vam."
                },
                {
                  icon: Users,
                  title: "Transparentnost",
                  description: "Jasni pogoji, brez skritih stroškov. Vse je zapisano in dostopno."
                },
                {
                  icon: Star,
                  title: "Povečajte ugled",
                  description: "Gradite svoj profil z ocenami in referencami zadovoljnih strank."
                },
                {
                  icon: ShieldCheck,
                  title: "Garancija plačila",
                  description: "LiftGO garancija plačila. Prejmete provizijo šele po zaključenem delu."
                },
                {
                  icon: TrendingUp,
                  title: "Večja vidnost",
                  description: "Dosežite stranke, ki vas sicer ne bi našle. Širite svoj doseg."
                }
              ].map((benefit) => (
                <Card key={benefit.title}>
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 lg:py-28 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Mnenja partnerjev
              </p>
              <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
                Kaj pravijo naši partnerji
              </h2>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  name: "Igor Božič",
                  company: "BožičVodovod s.p.",
                  location: "Ljubljana",
                  content: "Odkar sem partner LiftGO, prejemam 40% več povpraševanj mesečno. Platforma je enostavna, stranke pa resne.",
                  rating: 5
                },
                {
                  name: "Simon Golob",
                  company: "ElektroGolob d.o.o.",
                  location: "Koper",
                  content: "Končno platforma, ki razume obrtnike. Brezplačna prijava, pošten pristop in korektne stranke. Odlično!",
                  rating: 5
                },
                {
                  name: "Marko Vidmar",
                  company: "Mizarstvo Vidmar",
                  location: "Maribor",
                  content: "Najboljša odločitev za moje podjetje. LiftGO mi prinese kvalitetne stranke, jaz pa se osredotočim na delo.",
                  rating: 5
                }
              ].map((review) => (
                <Card key={review.name}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      "{review.content}"
                    </p>
                    <div className="mt-4 pt-4 border-t">
                      <p className="font-semibold text-foreground">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.company}</p>
                      <p className="text-xs text-muted-foreground">{review.location}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
              <CardContent className="p-8 lg:p-12">
                <div className="mx-auto max-w-3xl text-center">
                  <h2 className="font-display text-[28px] sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
                    Pripravljeni na več naročil?
                  </h2>
                  <p className="mt-4 text-[15px] sm:text-base lg:text-lg leading-relaxed text-muted-foreground">
                    Začnite prejemati kvalitetna povpraševanja še danes. Registracija traja samo 5 minut.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <Button size="lg" className="gap-2 w-full sm:w-auto min-h-[48px]" asChild>
                      <Link href="/partner-auth/sign-up">
                        Brezplačna registracija
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto min-h-[48px]" asChild>
                      <a href="mailto:info@liftgo.net">
                        <Mail className="h-4 w-4" />
                        Kontaktirajte nas
                      </a>
                    </Button>
                  </div>
                  <p className="mt-6 text-sm text-muted-foreground">
                    Ali pokličite: <a href="tel:+38669920963" className="text-primary hover:underline">+386 69 920 963</a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
