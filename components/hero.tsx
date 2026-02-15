"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle, Star, Phone, Mail, MapPin, X, Clock, Shield, Wrench, Loader2 } from "lucide-react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FileUploadZone } from "@/components/file-upload-zone"
import HeroDemonstrator from "@/components/hero-demonstrator"

const STORITVE = [
  "Gradnja & adaptacije",
  "Vodovod & ogrevanje",
  "Elektrika & pametni sistemi",
  "Mizarstvo & kovinarstvo",
  "Zaključna dela",
  "Okna, vrata & senčila",
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

export function Hero() {
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [gdprChecked, setGdprChecked] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    storitev: "",
    lokacija: "",
    email: "",
    telefon: "",
    zeljeniDatum: "",
    opis: "",
  })
  const [showLokacijaSuggestions, setShowLokacijaSuggestions] = useState(false)
  const [lokacijaInput, setLokacijaInput] = useState("")
  const [filteredLokacije, setFilteredLokacije] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [formFiles, setFormFiles] = useState<File[]>([])

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
    if (!formData.opis.trim()) {
      newErrors.opis = "Opis dela je obvezen"
    } else if (formData.opis.length > 500) {
      newErrors.opis = "Opis je predolg (max 500 znakov)"
    }
    if (!gdprChecked) newErrors.gdpr = "Soglasje je obvezno"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const response = await fetch('/api/povprasevanje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Napaka pri oddaji povpraševanja')
      }
      
      setSubmitted(true)
    } catch (error) {
      console.error('[v0] Form submission error:', error)
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Napaka pri pošiljanju. Poskusite znova.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setSubmitted(false)
    setGdprChecked(false)
    setErrors({})
    setFormData({ storitev: "", lokacija: "", email: "", telefon: "", zeljeniDatum: "", opis: "" })
    setLokacijaInput("")
    setShowLokacijaSuggestions(false)
    setFilteredLokacije([])
    setUploadedFiles([])
    setFormFiles([])
  }

  return (
    <section className="relative overflow-hidden pt-20 pb-12 lg:pb-0">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-secondary/30" />

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 lg:py-16">
          {/* Left content */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                225+ aktivnih mojstrov po vsej Sloveniji
              </span>
            </div>

            <h1 className="mt-6 font-display text-[28px] font-bold leading-tight text-foreground text-balance sm:text-5xl md:text-6xl">
              Povejte, kaj potrebujete.
              <span className="text-primary"> Mi najdemo mojstra.</span>
            </h1>

            <p className="mt-5 max-w-lg text-[15px] sm:text-lg leading-relaxed text-muted-foreground">
              Oddajte brezplačno povpraševanje in prejmite ponudbo preverjenega obrtnika v manj kot 2 urah.
            </p>

            {/* Inline Quick Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const el = document.getElementById("oddaj-povprasevanje")
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" })
                }
              }}
              className="mt-8"
            >
              <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-lg sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Select
                    value={formData.storitev}
                    onValueChange={(val) => setFormData({ ...formData, storitev: val })}
                  >
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 min-h-[48px] text-[16px]">
                      <SelectValue placeholder="Kaj potrebujete?" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORITVE.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="hidden h-8 w-px bg-border sm:block" />
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    inputMode="text"
                    autoComplete="address-level2"
                    placeholder="Lokacija?"
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
                    className="border-0 shadow-none focus-visible:ring-0 min-h-[48px] text-[16px]"
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
                <Button type="submit" size="lg" className="gap-2 sm:px-8 w-full sm:w-auto min-h-[48px]">
                  Oddajte povpraševanje
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap items-center gap-6 border-t pt-6">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">4.9</span>
                <span className="text-xs text-muted-foreground">iz 1.200+ ocen</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <p className="text-xs text-muted-foreground">
                Zaupajo nam stranke iz Ljubljane, Maribora, Celja, Kopra in še 50+ mest
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/cenik"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Ste obrtnik? Oglejte si cenik
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right - Demonstrator */}
          <div className="relative lg:mt-0">
            <div className="relative overflow-hidden rounded-2xl min-h-[400px] sm:min-h-[500px] lg:min-h-[620px] flex items-center justify-center">
              <HeroDemonstrator />
            </div>

            <div className="absolute left-2 bottom-20 rounded-xl border bg-card p-3 shadow-xl sm:left-4 sm:bottom-24 sm:p-4 lg:-left-8">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">Pravkar zaključeno</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Prenova kopalnice - Ljubljana</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                ))}
                <span className="ml-1 text-xs text-muted-foreground">5.0</span>
              </div>
            </div>

            <div className="absolute right-2 top-6 rounded-xl border bg-card p-3 shadow-xl sm:right-4 sm:top-8 sm:p-4 lg:-right-8">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Ta mesec</p>
              <p className="font-display text-xl sm:text-2xl font-bold text-primary">347</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">uspešno povezav</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full inquiry dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-lg">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Povpraševanje prejeto!</DialogTitle>
                <DialogDescription className="text-base">
                  V roku 2 ur boste prejeli email s ponudbami ustreznih mojstrov. Preverite mapo Prejeto.
                </DialogDescription>
              </DialogHeader>

              <Button 
                size="lg" 
                className="mt-4 w-full sm:w-auto min-h-[48px]" 
                onClick={() => {
                  resetForm()
                  setShowForm(true)
                  setSubmitted(false)
                }}
              >
                Oddaj novo povpraševanje
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Oddajte povpraševanje</DialogTitle>
                <DialogDescription>
                  Izpolnitev traja ~2 minuti
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="inq-storitev">Storitev *</Label>
                  <Select
                    value={formData.storitev}
                    onValueChange={(val) => {
                      setFormData({ ...formData, storitev: val })
                      if (errors.storitev) setErrors({ ...errors, storitev: "" })
                    }}
                  >
                    <SelectTrigger id="inq-storitev" aria-invalid={!!errors.storitev} className="min-h-[48px] text-[16px]">
                      <SelectValue placeholder="-- Izberi storitev --" />
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
                  <Label htmlFor="inq-lokacija">Lokacija *</Label>
                  <div className="relative">
                    <Input
                      id="inq-lokacija"
                      type="text"
                      placeholder="npr. Ljubljana, Maribor, Celje..."
                      autoComplete="address-level2"
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
                  <Label htmlFor="inq-email">E-poštni naslov *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="inq-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="npr. janez@gmail.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value })
                        if (errors.email) setErrors({ ...errors, email: "" })
                      }}
                      onBlur={() => {
                        if (!formData.email.trim()) {
                          setErrors({ ...errors, email: "Vnesite e-poštni naslov" })
                        } else if (!validateEmail(formData.email)) {
                          setErrors({ ...errors, email: "Nepravilen e-poštni naslov" })
                        }
                      }}
                      className="pl-10 min-h-[48px] text-[16px]"
                      aria-invalid={!!errors.email}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="inq-telefon">Telefonska številka *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="inq-telefon"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+386 XX XXX XXX"
                      pattern="[+0-9\s\-]{8,15}"
                      value={formData.telefon}
                      onChange={(e) => {
                        setFormData({ ...formData, telefon: e.target.value })
                        if (errors.telefon) setErrors({ ...errors, telefon: "" })
                      }}
                      onBlur={() => {
                        if (!formData.telefon.trim()) {
                          setErrors({ ...errors, telefon: "Vnesite telefonsko številko" })
                        } else if (!validatePhone(formData.telefon)) {
                          setErrors({ ...errors, telefon: "Nepravilna telefonska številka (npr. +386 41 123 456)" })
                        }
                      }}
                      className="pl-10 min-h-[48px] text-[16px]"
                      aria-invalid={!!errors.telefon}
                    />
                  </div>
                  {errors.telefon && <p className="text-xs text-destructive">{errors.telefon}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="inq-datum">Željeni datum izvedbe (neobvezno)</Label>
                  <Input
                    id="inq-datum"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.zeljeniDatum}
                    onChange={(e) => {
                      setFormData({ ...formData, zeljeniDatum: e.target.value })
                    }}
                    className="min-h-[48px] text-[16px]"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="inq-opis">Kratek opis dela *</Label>
                  <Textarea
                    id="inq-opis"
                    placeholder="Opišite problem — kaj se dogaja, kje, od kdaj..."
                    value={formData.opis}
                    onChange={(e) => {
                      setFormData({ ...formData, opis: e.target.value })
                      if (errors.opis) setErrors({ ...errors, opis: "" })
                    }}
                    onBlur={() => {
                      if (!formData.opis.trim()) {
                        setErrors({ ...errors, opis: "Opis dela je obvezen" })
                      }
                    }}
                    rows={3}
                    maxLength={500}
                    aria-invalid={!!errors.opis}
                    className="text-[16px]"
                  />
                  <div className="flex justify-between text-xs">
                    <span className={errors.opis ? "text-destructive" : ""}>
                      {errors.opis || ""}
                    </span>
                    <span className="text-muted-foreground">
                      {formData.opis.length} / 500
                    </span>
                  </div>
                </div>

                <FileUploadZone
                  accept="image/jpeg,image/png,video/mp4,video/quicktime,application/pdf"
                  maxFiles={5}
                  maxSizeMB={100}
                  label="Priložite fotografije ali video (neobvezno)"
                  sublabel="Max 5 datotek. Slike do 10MB, videi do 100MB. Podprte: JPG, PNG, MP4, MOV, PDF"
                  onFilesChange={(files) => setFormFiles(files)}
                />

                {/* Optional Integrations Section */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground mb-3">
                    Dodatne možnosti (neobvezno)
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                      <Checkbox id="video-diagnoza-opt" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="video-diagnoza-opt" className="text-sm font-medium cursor-pointer">
                          Video Diagnoza
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Posnemite kratek video problema - obrtnik bo lahko pripravil natančnejšo oceno
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                      <Checkbox id="e-kljuc-opt" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="e-kljuc-opt" className="text-sm font-medium cursor-pointer">
                          E-Ključ dostop
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Omogočite obrtinku varen začasen dostop do nepremičnine (PIN/pametna ključavnica)
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Te možnosti lahko nastavite tudi kasneje preko e-pošte
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="gdpr-hero"
                    checked={gdprChecked}
                    onCheckedChange={(checked) => setGdprChecked(checked === true)}
                    aria-invalid={!!errors.gdpr}
                  />
                  <Label htmlFor="gdpr-hero" className="text-xs leading-relaxed text-muted-foreground font-normal">
                    Soglašam z{" "}
                    <Link href="/privacy" className="underline hover:text-foreground">
                      obdelavo osebnih podatkov
                    </Link>{" "}
                    in{" "}
                    <Link href="/terms" className="underline hover:text-foreground">
                      pogoji uporabe
                    </Link>.
                  </Label>
                </div>
                {errors.gdpr && <p className="-mt-2 text-xs text-destructive">{errors.gdpr}</p>}
                
                {errors.submit && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {errors.submit}
                  </div>
                )}

                <Button 
                  type="submit" 
                  size="lg" 
                  className="mt-1 gap-2 w-full sm:w-auto min-h-[48px]" 
                  disabled={
                    isLoading || 
                    !formData.storitev || 
                    !formData.lokacija || 
                    !formData.email.trim() || 
                    !formData.telefon.trim() || 
                    !formData.opis.trim() || 
                    !gdprChecked
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pošiljam...
                    </>
                  ) : (
                    <>
                      Oddajte povpraševanje
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  100% brezplačno. Brez obveznosti. Odziv v 2 urah.
                </p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
