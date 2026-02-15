import Link from "next/link"
import type { Metadata } from "next"
import { ChevronDown } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export const metadata: Metadata = {
  title: "Pogosta vprašanja - LiftGO",
  description: "Odgovori na najpogostejša vprašanja o LiftGO storitev.",
}

const faqs = [
  {
    question: "Kako funkcionira LiftGO?",
    answer: "LiftGO je preprosta: Vnesete vrsto storitve in lokacijo, prikaže se vam seznam preverenih mojstrov, izberete, ki vam je najsimplje, in dogovorite se za obisk. Mojster se v 24 urah odzove ali je povratek denarja.",
  },
  {
    question: "Ali je mojster zanesljiv?",
    answer: "Vsi mojstri na LiftGO so prevereni in imajo povratne informacije od prejšnjih strank. Njihov profil jasno prikazuje njihov strokovni nivo in izkušnje. Preberi recenzije in odločite se z zaupanjem.",
  },
  {
    question: "Kaj če se mojster ne pojavi?",
    answer: "Če se mojster ne odzove v 24 urah, vam LiftGO vrne denar. To je naša garancija. Vedno imamo rezervnega mojstra, ki je pripravljen priti.",
  },
  {
    question: "Kaj se zgodi, če delo ni kakovostno?",
    answer: "Če niste zadovoljni z delom, nam povejte. Vse manj kakovostne projekte rešimo skupaj z mojstrom ali vam vrnemo denar. Garancija je na mestu.",
  },
  {
    question: "Kako je z varovanjem podatkov?",
    answer: "Vaši osebni podatki so varni pri nas. Uporabljamo najtrdnejše standarde varovanja in se nikoli ne delimo z nikim brez vaše dovoljenja.",
  },
  {
    question: "Ali je dostava brezplačna?",
    answer: "Cena je vedno jasna pred prihodom mojstra. Ni skritih stroškov. To vidite v ponudbi obrtnika.",
  },
]

export default function FAQPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <h1 className="font-display text-4xl font-bold text-foreground text-balance">
              Pogosta vprašanja
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Odgovori na vprašanja, ki jih postavlja večina naših uporabnikov.
            </p>

            <div className="mt-12 space-y-4">
              {faqs.map((faq, index) => (
                <Collapsible key={index} className="rounded-lg border">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 lg:p-6">
                    <h3 className="text-left font-display font-semibold text-foreground">
                      {faq.question}
                    </h3>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t px-4 py-4 text-muted-foreground lg:px-6">
                    {faq.answer}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            <div className="mt-12 rounded-2xl border bg-muted/50 p-8 text-center lg:p-12">
              <p className="text-lg font-semibold text-foreground">
                Ali imate drugo vprašanje?
              </p>
              <p className="mt-2 text-muted-foreground">
                Stopite v{" "}
                <Link
                  href="mailto:info@liftgo.net"
                  className="font-semibold text-primary hover:underline"
                >
                  stik z nami
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
