"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Clock,
  Users,
  Shield,
  Phone,
  Wrench,
  Loader2,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STORITVE = [
  "Gradnja & adaptacije",
  "Vodovod & ogrevanje",
  "Elektrika & pametni sistemi",
  "Mizarstvo & kovinarstvo",
  "Zaključna dela",
  "Okna vrata & senčila",
  "Okolica & zunanja ureditev",
  "Vzdrževanje & popravila",
  "Poslovne storitve",
  "Drugo",
]

const LOKACIJE = [
  "Ljubljana",
  "Maribor",
  "Celje",
  "Kranj",
  "Koper",
  "Novo Mesto",
  "Velenje",
  "Murska Sobota",
  "Ptuj",
  "Kamnik",
  "Domžale",
  "Škofja Loka",
  "Trbovlje",
  "Krško",
  "Postojna",
  "Slovenj Gradec",
  "Jesenice",
  "Nova Gorica",
  "Brežice",
  "Izola",
]

const partnerBenefits = [
  { icon: TrendingUp, text: "START paket - brez mesečne naročnine, brez tveganja" },
  { icon: Shield, text: "START: 10% provizija | PRO: samo 5% provizija" },
  { icon: Users, text: "Dostop do 1.000+ mesečnih povpraševanj (oba paketa)" },
  { icon: Clock, text: "PRO: prioritetni prikaz, CRM, generator ponudb za 29 EUR/mesec" },
]

export function CTA() {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [gdprChecked, setGdprChecked] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    storitev: "",
    lokacija: "",
    email: "",
    telefon: "",
    opis: "",
  })
  const [showLokacijaSuggestions, setShowLokacijaSuggestions] = useState(false)
  const [lokacijaInput, setLokacijaInput] = useState("")
  const [filteredLokacije, setFilteredLokacije] = useState<string[]>([])

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, "")
    return /^(\+386|0)[0-9]{8,9}$/.test(cleaned)
  }

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleLokacijaChange = (value: string) => {
    setLokacijaInput(value)
    setFormData({ ...formData, lokacija: value })
    if (errors.lokacija) setErrors({ ...errors, lokacija: "" })
    
    if (value.trim() === "") {
      setFilteredLokacije([])
      setShowLokacijaSuggestions(false)
    } else {
      const filtered = LOKACIJE.filter(lok => 
        lok.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredLokacije(filtered)
      setShowLokacijaSuggestions(filtered.length > 0)
    }
  }

  const selectLokacija = (lokacija: string) => {
    setLokacijaInput(lokacija)
    setFormData({ ...formData, lokacija })
    setShowLokacijaSuggestions(false)
    if (errors.lokacija) setErrors({ ...errors, lokacija: "" })
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.storitev) newErrors.storitev = "Izberite storitev"
    if (!formData.lokacija) newErrors.lokacija = "Izberite lokacijo"
    if (!formData.email.trim()) {
      newErrors.email = "Vnesite e-poštni naslov"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Nepravilen e-poštni naslov"
    }
    if (!formData.telefon.trim()) {
      newErrors.telefon = "Vnesite telefonsko številko"
    } else if (!validatePhone(formData.telefon)) {
      newErrors.telefon = "Nepravilna telefonska številka (npr. +386 41 123 456)"
    }
    if (!gdprChecked) newErrors.gdpr = "Soglasje je obvezno"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    setSubmitError(false)
    try {
      await new Promise((r) => setTimeout(r, 1500))
      setSubmitted(true)
    } catch {
      setSubmitError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section id="oddaj-povprasevanje" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Inquiry form */}
          <div className="rounded-3xl border bg-card p-6 sm:p-8 lg:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-6 font-display text-[28px] sm:text-3xl font-bold text-foreground text-balance">
              Oddajte povpraševanje
            </h3>
            <p className="mt-3 text-[15px] sm:text-base leading-relaxed text-muted-foreground">
              Izpolnite obrazec in prejmite ponudbo od preverjenega mojstra v manj kot 2 urah. Brez obveznosti.
            </p>

            {submitted ? (
              <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-green-300 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950/40">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-4xl">
                  ✅
                </div>
                <h4 className="font-display text-xl font-bold text-green-800 dark:text-green-200">
                  Povpraševanje uspešno oddano!
                </h4>
                <p className="max-w-sm text-sm text-green-700 dark:text-green-300">
                  Preverjen mojster vas bo kontaktiral v manj kot 2 urah na vašo telefonsko številko ali email.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Hvala za zaupanje. Ekipa LiftGO
                </p>
              </div>
            ) : (
              <>
                {submitError && (
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
                    <div className="text-2xl">❌</div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Prišlo je do napake pri pošiljanju. Prosimo pokličite nas na{" "}
                      <a href="mailto:info@liftgo.net" className="font-medium underline hover:no-underline">
                        info@liftgo.net
                      </a>{" "}
                      ali poskusite znova.
                    </p>
                  </div>
                )}
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="cta-storitev">Storitev *</Label>
                  <Select
                    value={formData.storitev}
                    onValueChange={(val) => {
                      setFormData({ ...formData, storitev: val })
                      if (errors.storitev) setErrors({ ...errors, storitev: "" })
                    }}
                  >
                    <SelectTrigger id="cta-storitev" aria-invalid={!!errors.storitev} className="min-h-[48px] text-[16px]">
                      <SelectValue placeholder="Izberite storitev..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STORITVE.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.storitev && <p className="text-xs text-destructive">{errors.storitev}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cta-lokacija">Lokacija *</Label>
                  <div className="relative">
                    <Input
                      id="cta-lokacija"
                      type="text"
                      inputMode="text"
                      autoComplete="address-level2"
                      placeholder="Začnite tipkati mesto..."
                      value={lokacijaInput}
                      onChange={(e) => handleLokacijaChange(e.target.value)}
                      onFocus={() => {
                        if (lokacijaInput.trim() && filteredLokacije.length > 0) {
                          setShowLokacijaSuggestions(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowLokacijaSuggestions(false), 200)
                      }}
                      aria-invalid={!!errors.lokacija}
                      className="min-h-[48px] text-[16px]"
                    />
                    {showLokacijaSuggestions && filteredLokacije.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
                        {filteredLokacije.map((lok) => (
                          <div
                            key={lok}
                            onClick={() => selectLokacija(lok)}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            {lok}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.lokacija && <p className="text-xs text-destructive">{errors.lokacija}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cta-telefon">Telefonska številka *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="cta-telefon"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+386 41 123 456"
                      value={formData.telefon}
                      onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                      className="pl-10 min-h-[48px] text-[16px]"
                      aria-invalid={!!errors.telefon}
                    />
                  </div>
                  {errors.telefon && <p className="text-xs text-destructive">{errors.telefon}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cta-email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="cta-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="npr. janez@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 min-h-[48px] text-[16px]"
                      aria-invalid={!!errors.email}
                      required
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="flex items-start gap-3 py-2">
                  <Checkbox
                    id="gdpr-cta"
                    checked={gdprChecked}
                    onCheckedChange={(checked) => setGdprChecked(checked === true)}
                    aria-invalid={!!errors.gdpr}
                    className="mt-0.5 h-5 w-5"
                    required
                  />
                  <Label htmlFor="gdpr-cta" className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer">
                    Strinjam se z obdelavo osebnih podatkov v skladu z{" "}
                    <Link href="/privacy" className="underline hover:text-foreground">
                      Politiko zasebnosti
                    </Link>.
                  </Label>
                </div>
                {errors.gdpr && <p className="-mt-2 text-xs text-destructive">{errors.gdpr}</p>}

                <div className="grid gap-1.5">
                  <Label htmlFor="cta-opis">Kratek opis dela</Label>
                  <Textarea
                    id="cta-opis"
                    placeholder="Opišite, kaj potrebujete (neobvezno)..."
                    value={formData.opis}
                    onChange={(e) => setFormData({ ...formData, opis: e.target.value })}
                    rows={3}
                    autoComplete="off"
                    spellCheck={true}
                    className="text-[16px]"
                  />
                </div>

                <Button type="submit" size="lg" className="mt-1 gap-2 w-full sm:w-auto min-h-[48px]" disabled={isLoading || !gdprChecked}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pošiljamo...
                    </>
                  ) : (
                    <>
                      Oddajte povpraševanje
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Brezplačno
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" />
                    Odziv v 2 urah
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-primary" />
                    Brez obveznosti
                  </span>
                </div>
              </form>
              </>
            )}
          </div>

          {/* For Partners */}
          <div className="flex flex-col justify-between rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8 lg:p-12">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-6 font-display text-[28px] sm:text-3xl font-bold text-foreground text-balance">
                Plačaš samo, ko zaslužiš
              </h3>
              <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-muted-foreground">
                Brez vezav in drobnega tiska. Začnite brezplačno s START paketom
                ali izberite PRO za več naročil, manj provizije in več reda.
              </p>

              {/* Commission comparison */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-card p-4 text-center border">
                  <p className="text-xs font-medium text-muted-foreground">START</p>
                  <p className="font-display text-2xl font-bold text-foreground">10%</p>
                  <p className="text-xs text-muted-foreground">provizija</p>
                  <p className="mt-1 text-xs font-medium text-primary">0 EUR/mesec</p>
                </div>
                <div className="rounded-xl bg-card p-4 text-center border border-primary/30">
                  <p className="text-xs font-medium text-primary">PRO</p>
                  <p className="font-display text-2xl font-bold text-primary">5%</p>
                  <p className="text-xs text-muted-foreground">provizija</p>
                  <p className="mt-1 text-xs font-medium text-primary">29 EUR/mesec</p>
                </div>
              </div>

              <ul className="mt-6 flex flex-col gap-3">
                {partnerBenefits.map((b) => (
                  <li
                    key={b.text}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <b.icon className="h-4 w-4 text-primary" />
                    </div>
                    {b.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2 w-full sm:w-auto min-h-[48px]" asChild>
                <Link href="/cenik">
                  Oglejte si cenik
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 bg-transparent w-full sm:w-auto min-h-[48px]" asChild>
                <Link href="/partner-auth/sign-up">Registracija</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
