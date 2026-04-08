'use client'

import Link from "next/link"
import { useState } from "react"
import { Check, X, ArrowRight, Sparkles, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { STRIPE_PRODUCTS } from '@/lib/stripe/config'

const startPlan = STRIPE_PRODUCTS.START
const proPlan = STRIPE_PRODUCTS.PRO

const features = [
  { name: "Mesečna naročnina", start: "0 €", pro: "29 €", elite: "79 €" },
  { name: "Provizija", start: `${startPlan.commission}%`, pro: `${proPlan.commission}%`, elite: "~10%" },
  { name: "Dostop do povpraševanj", start: true, pro: true, elite: true },
  { name: "Vidnost profila", start: "Standardna", pro: "Prioritetna", elite: "Top pozicija" },
  { name: "AI sporočila/dan", start: "5", pro: "100", elite: "Neomejeno" },
  { name: "AI: Generator ponudb", start: false, pro: true, elite: true },
  { name: "AI: Materiali in zaloge", start: false, pro: true, elite: true },
  { name: "AI: Video diagnoza", start: false, pro: true, elite: true },
  { name: "AI: Povzetek dela", start: false, pro: true, elite: true },
  { name: "Urnik in termini", start: true, pro: true, elite: true },
  { name: "CRM orodje", start: false, pro: true, elite: true },
  { name: "Prednostna podpora", start: false, pro: true, elite: true },
  { name: "Analitika", start: false, pro: true, elite: true },
  { name: "Ekskluzivni lead-i", start: false, pro: false, elite: true },
]

export function PricingComparison() {
  const [loading, setLoading] = useState(false)

  async function handleProCheckout() {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/partner-auth/login?redirect=/cenik'
        return
      }

      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'PRO',
          email: user.email,
          successPath: '/partner-dashboard/account/narocnina?stripe=success',
          cancelPath: '/cenik?cancelled=true',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka pri plačilu')
      if (data.url) window.location.href = data.url
    } catch (err: any) {
      alert('Napaka pri plačilu: ' + (err.message || 'Poskusite ponovno') + '\n\nKontaktirajte info@liftgo.net')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        {/* CRAFTSMEN SECTION */}
        <div className="mb-20 lg:mb-28">
          {/* Header */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Za obrtnike
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground lg:text-5xl text-balance">
              Plačaš samo, ko zaslužiš
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
              Brez vezav, brez drobnega tiska. Izberi paket, ki ti ustreza.
            </p>
          </div>

          {/* Desktop: Comparison Table */}
          <div className="mt-14 hidden lg:block">
            <div className="overflow-hidden rounded-3xl border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-6 text-left">
                      <span className="text-sm font-medium text-muted-foreground">Funkcija</span>
                    </th>
                    <th className="p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          Brezplačno
                        </Badge>
                        <span className="font-display text-2xl font-bold text-foreground">START</span>
                      </div>
                    </th>
                    <th className="bg-primary/5 p-6 text-center relative">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground text-xs font-semibold gap-1">
                          <Sparkles className="h-3 w-3" />
                          Priporočeno
                        </Badge>
                      </div>
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <span className="font-display text-2xl font-bold text-foreground">PRO</span>
                        <span className="text-sm text-muted-foreground">29 € / mesec</span>
                      </div>
                    </th>
                    <th className="p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          Premium
                        </Badge>
                        <span className="font-display text-2xl font-bold text-foreground">ELITE</span>
                        <span className="text-sm text-muted-foreground">79 € / mesec</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr key={feature.name} className={index !== features.length - 1 ? 'border-b' : ''}>
                      <td className="p-6 text-sm font-medium text-foreground">
                        {feature.name}
                      </td>
                      <td className="p-6 text-center">
                        {typeof feature.start === 'boolean' ? (
                          feature.start ? (
                            <Check className="mx-auto h-5 w-5 text-green-600" />
                          ) : (
                            <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">{feature.start}</span>
                        )}
                      </td>
                      <td className="bg-primary/5 p-6 text-center">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check className="mx-auto h-5 w-5 text-green-600" />
                          ) : (
                            <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
                          )
                        ) : (
                          <span className="text-sm font-medium text-foreground">{feature.pro}</span>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        {typeof feature.elite === 'boolean' ? (
                          feature.elite ? (
                            <Check className="mx-auto h-5 w-5 text-green-600" />
                          ) : (
                            <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
                          )
                        ) : (
                          <span className="text-sm font-medium text-foreground">{feature.elite}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* CTAs in table footer */}
              <div className="grid grid-cols-4 border-t">
                <div className="p-6"></div>
                <div className="p-6 flex items-center justify-center">
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="gap-2 w-full"
                  >
                    <Link href="/registracija-mojster?plan=start">
                      Začnite brezplačno
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="bg-primary/5 p-6 flex items-center justify-center">
                  <Button
                    onClick={handleProCheckout}
                    disabled={loading}
                    size="lg"
                    className="gap-2 w-full"
                  >
                    {loading ? 'Preusmerjam...' : 'Izberite PRO'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="p-6 flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 w-full"
                    asChild
                  >
                    <a href="mailto:info@liftgo.net?subject=ELITE%20-%20zanimanje">
                      Kontaktirajte nas
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Card View */}
          <div className="mt-14 grid gap-6 lg:hidden">
            {/* START Card */}
            <div className="flex flex-col rounded-3xl border bg-card p-8">
              <Badge variant="secondary" className="w-fit text-xs font-semibold">
                Brezplačno
              </Badge>
              <h2 className="mt-4 font-display text-2xl font-bold text-foreground">START</h2>
              
              <div className="mt-6 space-y-4 border-t pt-6">
                {features.map((feature) => (
                  <div key={feature.name} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{feature.name}</span>
                    {typeof feature.start === 'boolean' ? (
                      feature.start ? (
                        <Check className="h-5 w-5 shrink-0 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 shrink-0 text-muted-foreground/30" />
                      )
                    ) : (
                      <span className="text-muted-foreground">{feature.start}</span>
                    )}
                  </div>
                ))}
              </div>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-6 gap-2"
              >
                <Link href="/registracija-mojster?plan=start">
                  Začnite brezplačno
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* PRO Card */}
            <div className="relative flex flex-col rounded-3xl border border-primary bg-primary/5 p-8 shadow-lg shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold gap-1">
                  <Sparkles className="h-3 w-3" />
                  Priporočeno
                </Badge>
              </div>
              
              <h2 className="mt-4 font-display text-2xl font-bold text-foreground">PRO</h2>
              <p className="mt-1 text-sm text-muted-foreground">29 € / mesec</p>
              
              <div className="mt-6 space-y-4 border-t pt-6">
                {features.map((feature) => (
                  <div key={feature.name} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{feature.name}</span>
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? (
                        <Check className="h-5 w-5 shrink-0 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 shrink-0 text-muted-foreground/30" />
                      )
                    ) : (
                      <span className="font-medium text-foreground">{feature.pro}</span>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleProCheckout}
                disabled={loading}
                size="lg"
                className="mt-6 gap-2"
              >
                {loading ? 'Preusmerjam...' : 'Izberite PRO'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>

            {/* ELITE Card */}
            <div className="flex flex-col rounded-3xl border bg-card p-8">
              <Badge variant="secondary" className="w-fit text-xs font-semibold">
                Premium
              </Badge>
              <h2 className="mt-4 font-display text-2xl font-bold text-foreground">ELITE</h2>
              <p className="mt-1 text-sm text-muted-foreground">79 € / mesec</p>
              
              <div className="mt-6 space-y-4 border-t pt-6">
                {features.map((feature) => (
                  <div key={feature.name} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{feature.name}</span>
                    {typeof feature.elite === 'boolean' ? (
                      feature.elite ? (
                        <Check className="h-5 w-5 shrink-0 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 shrink-0 text-muted-foreground/30" />
                      )
                    ) : (
                      <span className="text-muted-foreground">{feature.elite}</span>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="lg"
                className="mt-6 gap-2"
                asChild
              >
                <a href="mailto:info@liftgo.net?subject=ELITE%20-%20zanimanje">
                  Kontaktirajte nas
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Premium teaser */}
          <div className="mt-8 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/30 p-6 lg:p-8">
            <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-foreground">
                  PREMIUM - prihaja kmalu
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Samo za preverjene mojstre - top pozicije, skoraj brez provizije,
                  ekskluzivni lead-i. Bodite med prvimi.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="bg-transparent shrink-0">
                <a href="mailto:info@liftgo.net?subject=Premium%20-%20zanimanje">
                  Obvesti me
                </a>
              </Button>
            </div>
          </div>

          {/* Commission explanation */}
          <div className="mt-8 rounded-2xl border bg-card p-6 lg:p-8">
            <div className="flex flex-col items-start gap-3 text-center lg:flex-row lg:text-left lg:items-center">
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Kako deluje provizija?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Provizija <span className="font-medium text-foreground">~10% samo ob uspešno zaključenem delu</span>. Nič provizije, nič posla.
                </p>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm text-muted-foreground">
            <span>Brez vezav - preklic kadarkoli</span>
            <span className="hidden sm:inline text-border">|</span>
            <span>Brez drobnega tiska</span>
            <span className="hidden sm:inline text-border">|</span>
            <span>225+ aktivnih obrtnikov</span>
            <span className="hidden sm:inline text-border">|</span>
            <span>Podpora po telefonu in e-pošti</span>
          </div>
        </div>

        {/* CUSTOMERS SECTION */}
        <div className="border-t pt-20 lg:pt-28">
          {/* Header */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Za naročnike
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl text-balance">
              Kako to deluje za vas
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
              Preprost in pregleden sistem.
            </p>
          </div>

          {/* Customer Plans Cards */}
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* FREE Plan */}
            <div className="flex flex-col rounded-3xl border bg-card p-8">
              <Badge variant="secondary" className="w-fit text-xs font-semibold">
                Brezplačno
              </Badge>
              <h3 className="mt-4 font-display text-2xl font-bold text-foreground">FREE</h3>
              <p className="mt-2 text-sm text-muted-foreground">Za običajne naročnike</p>
              
              <div className="mt-6 border-t pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm text-foreground">Brez registracije</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm text-foreground">Dostop do obrtnikov</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm text-foreground">Pošiljanje povpraševanj</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PREMIUM Plan */}
            <div className="relative flex flex-col rounded-3xl border border-primary bg-primary/5 p-8 shadow-lg shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold gap-1">
                  <Sparkles className="h-3 w-3" />
                  Priporočeno
                </Badge>
              </div>

              <h3 className="mt-4 font-display text-2xl font-bold text-foreground">PREMIUM</h3>
              <p className="mt-2 text-sm text-muted-foreground">9 € / mesec</p>
              
              <div className="mt-6 border-t pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm text-foreground">Vse iz FREE paketa</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm text-foreground">Prioritetne ponudbe obrtnikov</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm text-foreground">Hitrejši odziv obrtnikov</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm text-foreground">Prioritetna podpora</span>
                  </div>
                </div>
              </div>

              <Button size="lg" className="mt-8 gap-2" asChild>
                <Link href="/povprasevanja">
                  Začnite
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Trust strip for customers */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm text-muted-foreground">
            <span>Varno in zaupanja vredno</span>
            <span className="hidden sm:inline text-border">|</span>
            <span>Hitri odzivi obrtnikov</span>
            <span className="hidden sm:inline text-border">|</span>
            <span>Brez skritih stroškov</span>
          </div>
        </div>
      </div>
    </section>
  )
}
