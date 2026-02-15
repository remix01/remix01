'use client'

import { ArrowRight, Search, Star, CalendarCheck, Sparkles, UserPlus, ShieldCheck, Bell, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const customerSteps = [
  {
    number: 1,
    icon: Search,
    title: "Poiščite storitev",
    description: "Vnesite vrsto storitve in lokacijo. Naš sistem takoj najde razpoložljive mojstre v bližini.",
  },
  {
    number: 2,
    icon: Star,
    title: "Izberite mojstra",
    description: "Preglejte profile, ocene in cene. Izberite strokovnjaka, ki vam najbolj ustreza.",
  },
  {
    number: 3,
    icon: CalendarCheck,
    title: "Dogovorite se",
    description: "Dogovorite se za čas obiska. Mojster potrdi termin — LiftGO garancija odziva.",
  },
  {
    number: 4,
    icon: Sparkles,
    title: "Ocenite izkušnjo",
    description: "Po opravljenem delu ocenite mojstra in pomagajte drugim pri izbiri.",
  },
]

const craftsmanSteps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Brezplačna registracija",
    description: "Ustvarite profil v 5 minutah.",
  },
  {
    number: 2,
    icon: ShieldCheck,
    title: "Verifikacija",
    description: "Preverimo vaše reference in dokumentacijo.",
  },
  {
    number: 3,
    icon: Bell,
    title: "Prejemate povpraševanja",
    description: "Stranke iz vaše regije in stroke.",
  },
  {
    number: 4,
    icon: Banknote,
    title: "Plačate samo po uspešnem delu",
    description: "Provizija samo ob zaključeni storitvi.",
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Kako deluje
          </p>
          <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Do mojstra v štirih preprostih korakih
          </h2>
          <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed">
            Brez zapletov, brez skritih stroškov. LiftGO poenostavi iskanje zanesljivih obrtnikov.
          </p>
        </div>

        <Tabs defaultValue="stranke" className="mt-10">
          <div className="flex justify-center">
            <TabsList>
              <TabsTrigger value="stranke">Za stranke</TabsTrigger>
              <TabsTrigger value="obrtniki">Za obrtnike</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stranke" className="mt-10">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {customerSteps.map((step, index) => (
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

                  {/* Connector line */}
                  {index < customerSteps.length - 1 && (
                    <div className="absolute -right-4 top-7 hidden h-0.5 w-8 bg-primary/20 lg:block" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <Button size="lg" asChild className="w-full sm:w-auto min-h-[48px]">
                <a href="#oddaj-povprasevanje">
                  Oddajte povprasevanje
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="obrtniki" className="mt-10">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {craftsmanSteps.map((step, index) => (
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

                  {/* Connector line */}
                  {index < craftsmanSteps.length - 1 && (
                    <div className="absolute -right-4 top-7 hidden h-0.5 w-8 bg-primary/20 lg:block" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <Button size="lg" asChild className="w-full sm:w-auto min-h-[48px]">
                <a href="/partner-auth/sign-up">
                  Postanite partner
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
