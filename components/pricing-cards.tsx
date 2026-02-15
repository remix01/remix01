'use client'

import Link from "next/link"
import { useState } from "react"
import {
  Check,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const plans = [
  {
    name: "START",
    badge: "Brezplačno",
    subtitle: "Za nove in občasne obrtnike",
    price: null,
    priceLabel: "0 EUR / mesec",
    commission: "10 %",
    commissionNote: "Provizija samo po uspešno zaključenem delu",
    commissionRange: "Min. 10 EUR / max. 150 EUR na posel",
    cta: "Začnite brezplačno",
    href: "/registracija-mojster?plan=start",
    recommended: false,
    features: [
      "Brez mesečne naročnine",
      "Profil obrtnika (podatki, storitve, lokacija)",
      "Do 3 aktivna povpraševanja hkrati",
      "Osnovni pregled naročil",
    ],
    hook: "Plačaš samo, ko zaslužiš. Brez tveganja.",
  },
  {
    name: "PRO",
    badge: "Priporočeno",
    subtitle: "Za obrtnike, ki želijo več naročil in manj kaosa",
    price: 29,
    priceLabel: "29 EUR / mesec",
    commission: "5 %",
    commissionNote: "Provizija samo po uspešno zaključenem delu",
    commissionRange: null,
    cta: "Izberite PRO",
    isPro: true,
    recommended: true,
    features: [
      "Vse iz START paketa",
      "Neomejena povpraševanja",
      { text: "Prioritetni prikaz v iskanju", proBadge: true },
      "Koledar in upravljanje terminov",
      { text: "Generator ponudb in računov", proBadge: true },
      { text: "CRM - zgodovina strank", proBadge: true },
    ],
    hook: "Manj provizije, več naročil, več reda.",
  },
]

export function PricingCards() {
  const [loading, setLoading] = useState(false)

  async function handleProCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.url) window.location.href = data.url
    } catch (err: any) {
      alert('Napaka pri plačilu: ' + err.message + '\n\nKontaktirajte info@liftgo.net')
    } finally {
      setLoading(false)
    }
  }
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Cenik za obrtnike
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground lg:text-5xl text-balance">
            Enostaven cenik. Plačaš samo, ko zaslužiš.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Brez vezav, brez drobnega tiska. Izberi paket, ki ti ustreza.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-8 lg:p-10 ${
                plan.recommended
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "bg-card"
              }`}
            >
              {/* Badge */}
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  plan.recommended
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {plan.recommended && <Sparkles className="h-3 w-3" />}
                {plan.badge}
              </span>

              <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
                {plan.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.subtitle}
              </p>

              {/* Price */}
              <div className="mt-6 border-t pt-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-foreground">
                    {plan.price === null ? "0" : plan.price}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    EUR / mesec
                  </span>
                </div>

                {/* Commission */}
                <div className="mt-3 rounded-xl bg-muted/60 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Provizija
                    </span>
                    <span className="font-display text-xl font-bold text-foreground">
                      {plan.commission}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.commissionNote}
                  </p>
                  {plan.commissionRange && (
                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      {plan.commissionRange}
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((f) => {
                  const feature = typeof f === 'string' ? { text: f, proBadge: false } : f
                  return (
                    <li key={feature.text} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground flex-1">{feature.text}</span>
                      {feature.proBadge && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          PRO ekskluzivno
                        </Badge>
                      )}
                    </li>
                  )
                })}
              </ul>

              {/* Hook */}
              <p className="mt-6 text-sm font-medium italic text-muted-foreground">
                {plan.hook}
              </p>

              {/* CTA */}
              {plan.isPro ? (
                <Button
                  onClick={handleProCheckout}
                  disabled={loading}
                  size="lg"
                  className="mt-6 gap-2"
                  variant="default"
                >
                  {loading ? 'Preusmerjam...' : plan.cta}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="mt-6 gap-2"
                  variant="outline"
                >
                  <Link href={plan.href}>
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
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
    </section>
  )
}
