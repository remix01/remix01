'use client'

import { ArrowRight, MessageSquare, Mail, Calendar, Star, Key, CheckCircle, Shield, Eye, DollarSign } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

const customerSteps = [
  {
    number: 1,
    emoji: "📝",
    title: "Opišite delo",
    description: "Izpolnite kratki obrazec, traja 60 sekund, brezplačno.",
  },
  {
    number: 2,
    emoji: "📨",
    title: "Prejmete ponudbe",
    description: "V manj kot 24 urah vas kontaktirajo preverjen mojstri.",
  },
  {
    number: 3,
    emoji: "📅",
    title: "Dogovorite se",
    description: "Mojster potrdi termin — LiftGO garancija odziva.",
  },
  {
    number: 4,
    emoji: "⭐",
    title: "Ocenite izkušnjo",
    description: "Vaša ocena pomaga drugim strankam.",
  },
]

const craftsmanSteps = [
  {
    number: 1,
    emoji: "🔑",
    title: "Registracija",
    description: "Ustvarite profil v 5 minutah, START brezplačno.",
  },
  {
    number: 2,
    emoji: "✅",
    title: "Verifikacija",
    description: "Preverimo identiteto, reference in zavarovanje (1–2 dni).",
  },
  {
    number: 3,
    emoji: "📲",
    title: "Prejemate naročila",
    description: "Stranke iz vaše regije, sami izbirate dela.",
  },
  {
    number: 4,
    emoji: "💶",
    title: "Plačate po uspehu",
    description: "START 10% | PRO 5% provizija po zaključenem delu.",
  },
]

const guarantees = [
  {
    icon: Shield,
    title: "Garancija odziva v 24 urah",
    description: "Mojster se odzove v 2 urah ali denar nazaj",
  },
  {
    icon: CheckCircle,
    title: "Preverjen mojster",
    description: "4-stopenjski postopek verifikacije",
  },
  {
    icon: DollarSign,
    title: "Transparentna cena",
    description: "Ni skritih stroškov, veste ceno vnaprej",
  },
  {
    icon: Eye,
    title: "Brez obveznosti",
    description: "Brezplačno povpraševanje, brez vezave",
  },
]

const customerFAQs = [
  {
    question: "Koliko stane oddaja povpraševanja?",
    answer: "Oddaja povpraševanja je popolnoma brezplačna. Ne plačate ničesar dokler se ne dogovorite z mojstrom.",
  },
  {
    question: "Kako hitro dobim odziv?",
    answer: "V povprečju prejmete ponudbo v manj kot 2 urah. Garancija odziva v 24 urah ali denar nazaj.",
  },
  {
    question: "Ali moram sprejeti ponudbo?",
    answer: "Ne. Povpraševanje je brez obveznosti. Ponudbe si lahko samo ogledate in se odločite brez pritiska.",
  },
  {
    question: "Kako vem, da je mojster zanesljiv?",
    answer: "Vsak mojster gre skozi 4-stopenjsko verifikacijo: identiteta, reference, zavarovanje in sprotne ocene strank.",
  },
]

const craftsmanFAQs = [
  {
    question: "Koliko stane registracija?",
    answer: "Registracija in START paket sta popolnoma brezplačna. Plačate samo 10% provizijo po uspešno zaključenem delu.",
  },
  {
    question: "Kdaj se zaračuna provizija?",
    answer: "Provizija se zaračuna samo ko stranki uspešno zaključite in zaračunate delo. Brez mesečnih naročnin pri START paketu.",
  },
  {
    question: "Kaj vključuje PRO paket?",
    answer: "PRO paket (29 EUR/mesec) vključuje: 5% provizijo (namesto 10%), prioritetni prikaz v rezultatih, CRM orodje in generator ponudb.",
  },
]

export default function KakoDelujePage() {
  const scrollToForm = () => {
    window.location.href = "/#oddaj-povprasevanje"
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
            <h1 className="font-display text-[32px] font-bold leading-tight text-primary-foreground text-balance sm:text-5xl md:text-6xl">
              Kako deluje LiftGO?
            </h1>
            <p className="mt-6 text-[16px] sm:text-lg leading-relaxed text-primary-foreground/90">
              Od povpraševanja do zaključenega dela v štirih preprostih korakih. Brez zapletov, brez skritih stroškov.
            </p>
            <div className="mt-8">
              <Button
                size="lg"
                variant="secondary"
                onClick={scrollToForm}
                className="gap-2 min-h-[48px]"
              >
                Oddajte povpraševanje
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Tab Section */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <Tabs defaultValue="stranke" className="w-full">
              <div className="flex justify-center">
                <TabsList>
                  <TabsTrigger value="stranke">Za stranke</TabsTrigger>
                  <TabsTrigger value="obrtniki">Za obrtnike</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="stranke" className="mt-14">
                <div className="grid gap-10 sm:grid-cols-2 lg:gap-12">
                  {customerSteps.map((step) => (
                    <div key={step.number} className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                        {step.emoji}
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-semibold text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="obrtniki" className="mt-14">
                <div className="grid gap-10 sm:grid-cols-2 lg:gap-12">
                  {craftsmanSteps.map((step) => (
                    <div key={step.number} className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                        {step.emoji}
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-semibold text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Guarantees Section */}
        <section className="border-y bg-muted/30 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
                Zakaj LiftGO?
              </h2>
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {guarantees.map((guarantee) => (
                <div key={guarantee.title} className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <guarantee.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                    {guarantee.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {guarantee.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
                Pogosta vprašanja
              </h2>
            </div>

            <Tabs defaultValue="stranke-faq" className="mt-10">
              <div className="flex justify-center">
                <TabsList>
                  <TabsTrigger value="stranke-faq">Za stranke</TabsTrigger>
                  <TabsTrigger value="obrtniki-faq">Za obrtnike</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="stranke-faq" className="mt-8">
                <Accordion type="single" collapsible className="w-full">
                  {customerFAQs.map((faq, index) => (
                    <AccordionItem key={index} value={`customer-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>

              <TabsContent value="obrtniki-faq" className="mt-8">
                <Accordion type="single" collapsible className="w-full">
                  {craftsmanFAQs.map((faq, index) => (
                    <AccordionItem key={index} value={`craftsman-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
            <h2 className="font-display text-[28px] sm:text-3xl font-bold text-primary-foreground text-balance md:text-4xl">
              Pripravljeni začeti?
            </h2>
            <p className="mt-4 text-[15px] sm:text-base text-primary-foreground/90 leading-relaxed">
              Pridružite se tisočem zadovoljnih strank in obrtnikov po vsej Sloveniji.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={scrollToForm}
                className="gap-2 w-full sm:w-auto min-h-[48px]"
              >
                Oddajte povpraševanje
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="gap-2 w-full sm:w-auto min-h-[48px] border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="/partner-auth/sign-up">
                  Registrirajte se brezplačno
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
