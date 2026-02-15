"use client"

import { useState } from "react"
import { Shield, Eye, DollarSign, Key, CheckCircle, Info, X, UserCheck, FileCheck, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const features = [
  {
    icon: Shield,
    title: "Garancija odziva v 2 urah",
    subtitle: "Velja za vse registrirane stranke",
    description: "Vaš projekt je v dobrih rokah. Mojster se odzove v 2 urah ali vaš denar nazaj.",
    expandable: false,
  },
  {
    icon: DollarSign,
    title: "Transparentna cena",
    subtitle: undefined,
    description: "Ni skritih stroškov. Veste točno koliko boste plačali preden se delo začne.",
    expandable: false,
  },
  {
    icon: Eye,
    title: "Video diagnoza",
    subtitle: undefined,
    description: "Pošljite video vašega problema in dobite oceno pred prihodom obrtnika.",
    expandable: true,
    detail: {
      title: "Kako deluje Video diagnoza?",
      steps: [
        "Posnemite kratek video problema (npr. puščanje cevi, poškodba stene)",
        "Video priložite ob oddaji povpraševanja ali ga pošljite mojstru",
        "Mojster pregleda video in vam poda oceno ter okvirno ceno",
        "Manj nepotrebnih ogledov = hitrejši začetek dela",
      ],
    },
  },
  {
    icon: Key,
    title: "E-dostop za ključ",
    subtitle: undefined,
    description: "Varnost stanovanja s pametnim e-ključem. Ni potrebno biti doma.",
    expandable: true,
    detail: {
      title: "Kako deluje E-dostop za ključ?",
      steps: [
        "Aktivirate enkratno digitalno dovoljenje za mojstra",
        "Mojster prejme časovno omejen dostop (npr. 9:00-14:00)",
        "Delo se opravi, vi pa dobite obvestilo po zaključku",
        "Dovoljenje se samodejno izteče - polna sledljivost",
      ],
    },
  },
]

const verificationChecks = [
  { icon: UserCheck, label: "Preverjanje identitete", desc: "Osebni dokument in davčna številka" },
  { icon: FileCheck, label: "Reference in izkušnje", desc: "Pregled dosedanjih del in referenc" },
  { icon: ShieldCheck, label: "Zavarovanje odgovornosti", desc: "Obvezno zavarovanje za škodo" },
  { icon: CheckCircle, label: "Sprotno ocenjevanje", desc: "Ocene strank po vsakem opravljenem delu" },
]

export function Features() {
  const [openDetail, setOpenDetail] = useState<number | null>(null)

  return (
    <section className="bg-primary py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/70">
            Zakaj LiftGO
          </p>
          <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-primary-foreground text-balance md:text-4xl">
            Unikatne prednosti za vaš mir
          </h2>
          <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-primary-foreground/80">
            Štiri stvari, ki nas razlikujejo od ostalih. Izbira je očitna.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {features.map((feature, idx) => (
            <div key={feature.title} className="flex gap-6 rounded-2xl bg-primary-foreground/10 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/20">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-primary-foreground">
                  {feature.title}
                </h3>
                {feature.subtitle && (
                  <p className="mt-1 text-xs text-primary-foreground/60">
                    {feature.subtitle}
                  </p>
                )}
                <p className="mt-2 leading-relaxed text-primary-foreground/80">
                  {feature.description}
                </p>
                {feature.expandable && (
                  <button
                    onClick={() => setOpenDetail(idx)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground/90 underline underline-offset-4 transition-colors hover:text-primary-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Kako deluje?
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Verification badge section */}
        <div className="mt-16 rounded-2xl bg-primary-foreground/10 p-8 lg:p-10">
          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left lg:gap-8">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/20">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="mt-4 lg:mt-0 flex-1">
              <h3 className="font-display text-xl font-bold text-primary-foreground">
                Kaj pomeni "Preverjen mojster"?
              </h3>
              <p className="mt-2 leading-relaxed text-primary-foreground/80">
                Vsak obrtnik na platformi LiftGO gre skozi 4-stopenjski postopek preverjanja, preden prejme prvi posel.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {verificationChecks.map((check) => (
              <div key={check.label} className="flex items-start gap-3 rounded-xl bg-primary-foreground/10 p-4">
                <check.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-foreground" />
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">{check.label}</p>
                  <p className="mt-0.5 text-xs text-primary-foreground/70">{check.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature detail dialogs */}
      {features.map((feature, idx) => (
        feature.expandable && feature.detail ? (
          <Dialog key={feature.title} open={openDetail === idx} onOpenChange={(open) => { if (!open) setOpenDetail(null) }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                  {feature.detail.title}
                </DialogTitle>
                <DialogDescription>
                  Korak za korakom postopek uporabe te funkcionalnosti.
                </DialogDescription>
              </DialogHeader>
              <ol className="mt-4 flex flex-col gap-4">
                {feature.detail.steps.map((step, stepIdx) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {stepIdx + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-muted-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </DialogContent>
          </Dialog>
        ) : null
      ))}
    </section>
  )
}
