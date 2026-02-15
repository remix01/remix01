"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EKljucWizard } from "@/components/e-kljuc-wizard"
import {
  Lock,
  Wifi,
  Key,
  Calendar,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const howItWorksSteps = [
  {
    step: 1,
    icon: Lock,
    title: "Izberete način dostopa",
    description:
      "PIN, pametna ključavnica, ključavnica s kodo ali fizični ključ pri sosedu",
  },
  {
    step: 2,
    icon: Calendar,
    title: "Določite časovno okno",
    description: "Točen datum in ura od-do - dostop je samodejno omejen",
  },
  {
    step: 3,
    icon: CheckCircle,
    title: "Mojster dobi navodila",
    description: "Samodejno po emailu/SMS s PIN kodo ali navodili za dostop",
  },
]

const accessMethods = [
  {
    icon: Lock,
    title: "Enkratna PIN koda",
    description: "Ustvarite 6-mestno kodo veljavno samo za dogovorjeni termin",
    badge: "Najpogosteje izbrano",
    badgeVariant: "default" as const,
  },
  {
    icon: Wifi,
    title: "Smart Lock integracija",
    description: "Kompatibilno z: Yale, Nuki, Danalock, Schlage",
    badge: "Priporočeno",
    badgeVariant: "default" as const,
  },
  {
    icon: Key,
    title: "Fizični ključ pri sosedu",
    description: "Mojster prevzame ključ na dogovorjenem naslovu",
    badge: null,
    badgeVariant: null,
  },
]

// Mock access history
const mockAccessHistory = [
  {
    id: 1,
    date: "15. 1. 2025",
    time: "09:00 - 14:00",
    craftsman: "Janez Novak - Vodoinstalater",
    method: "PIN: 847293",
    status: "Zaključen",
  },
  {
    id: 2,
    date: "8. 1. 2025",
    time: "14:00 - 17:00",
    craftsman: "Marko Horvat - Elektrikar",
    method: "Smart Lock (Nuki)",
    status: "Zaključen",
  },
]

export default function EKljucPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">Varno in enostavno</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
                E-Ključ — Mojster pride, ko vi niste doma
              </h1>
              <p className="mt-6 text-lg sm:text-xl leading-relaxed text-muted-foreground text-balance">
                Varno in preprosto upravljajte dostop do vašega doma brez
                fizičnega predaje ključev
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => setWizardOpen(true)}
                  className="gap-2 min-h-[48px] w-full sm:w-auto"
                >
                  Aktiviraj E-Ključ
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setHowItWorksOpen(true)}
                  className="min-h-[48px] w-full sm:w-auto"
                >
                  Kako deluje?
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground text-balance">
                Kako deluje?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground text-balance">
                V 3 enostavnih korakih do varnega dostopa
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {howItWorksSteps.map((step) => (
                <Card key={step.step} className="relative">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                        {step.step}
                      </div>
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Access Methods */}
        <section className="py-20 lg:py-28 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground text-balance">
                Načini dostopa
              </h2>
              <p className="mt-4 text-lg text-muted-foreground text-balance">
                Izberite način ki vam najbolj ustreza
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {accessMethods.map((method) => (
                <Card key={method.title} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <method.icon className="h-6 w-6 text-primary" />
                      </div>
                      {method.badge && (
                        <Badge variant={method.badgeVariant}>
                          {method.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{method.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {method.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Security & History */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Security Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl">Varnost na prvem mestu</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Vaš dostop je vedno varen in nadzorovan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        Šifriran in časovno omejen dostop
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Vsi dostopi so šifrirani in avtomatsko preklicani po
                        izteku časa
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-muted/50 border p-4">
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Natančen časovni okvir</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Določite točno kdaj lahko mojster dostopa do objekta
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-muted/50 border p-4">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Preklic dostopa</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Kadarkoli prekličite dostop z enim klikom
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full gap-2 mt-6"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <X className="h-4 w-4" />
                    Prekliči aktivni dostop
                  </Button>
                </CardContent>
              </Card>

              {/* Access History */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">Zgodovina dostopov</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Pregled preteklih E-Ključev
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      {showHistory ? "Skrij" : "Prikaži"}
                    </Button>
                  </div>
                </CardHeader>
                {showHistory && (
                  <CardContent>
                    <div className="space-y-3">
                      {mockAccessHistory.map((access) => (
                        <div
                          key={access.id}
                          className="flex flex-col gap-2 rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {access.craftsman}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {access.date} • {access.time}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {access.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {access.method}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-4 lg:px-8 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground text-balance">
              Pripravljena na E-Ključ?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-balance">
              Aktivirajte E-Ključ in omogočite mojstru dostop tudi ko niste doma
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => setWizardOpen(true)}
                className="gap-2 min-h-[48px] w-full sm:w-auto"
              >
                Aktiviraj E-Ključ
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-[48px] w-full sm:w-auto"
                asChild
              >
                <Link href="/">Nazaj na domov</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Wizards and Dialogs */}
      <EKljucWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {/* How It Works Dialog */}
      <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Kako deluje E-Ključ?
            </DialogTitle>
            <DialogDescription>
              Preprost in varen način za upravljanje dostopa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {howItWorksSteps.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {step.step}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setHowItWorksOpen(false)}>
              Zapri
            </Button>
            <Button
              onClick={() => {
                setHowItWorksOpen(false)
                setWizardOpen(true)
              }}
              className="gap-2"
            >
              Aktiviraj E-Ključ
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Access Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Prekliči aktivni dostop?
            </DialogTitle>
            <DialogDescription>
              To dejanje bo takoj preklicalo vse aktivne E-Ključe. Mojster ne bo
              več mogel dostopati do objekta.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Prekliči
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setCancelDialogOpen(false)
                // Handle cancel logic here
              }}
            >
              Da, prekliči dostop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
