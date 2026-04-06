"use client"

import { useState, useCallback } from "react"
import { CheckCircle, Star, Phone, Mail, X, Clock, Shield } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

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

interface HeroFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HeroFormDialog({ open, onOpenChange }: HeroFormDialogProps) {
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
      const filtered = LOKACIJE.filter((lok) =>
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
      const response = await fetch("/api/povprasevanje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      // Unauthenticated users must register first — redirect with pre-filled data
      if (response.status === 401) {
        const params = new URLSearchParams({
          storitev: formData.storitev,
          lokacija: formData.lokacija,
          opis: formData.opis,
          email: formData.email,
          redirect: '/narocnik/novo-povprasevanje',
        })
        window.location.href = `/registracija?${params.toString()}`
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Napaka pri oddaji povpraševanja")
      }

      setSubmitted(true)
    } catch (error) {
      console.error("[v0] Form submission error:", error)
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Napaka pri pošiljanju. Poskusite znova.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    onOpenChange(false)
    setSubmitted(false)
    setGdprChecked(false)
    setErrors({})
    setFormData({
      storitev: "",
      lokacija: "",
      email: "",
      telefon: "",
      zeljeniDatum: "",
      opis: "",
    })
    setLokacijaInput("")
    setShowLokacijaSuggestions(false)
    setFilteredLokacije([])
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm()
      onOpenChange(newOpen)
    }}>
      <DialogContent className="sm:max-w-lg">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Povpraševanje prejeto!
              </DialogTitle>
              <DialogDescription className="text-base">
                V roku 2 ur boste prejeli email s ponudbami ustreznih mojstrov.
                Preverite mapo Prejeto.
              </DialogDescription>
            </DialogHeader>

            <Button
              size="lg"
              className="mt-4 w-full sm:w-auto min-h-[48px]"
              onClick={() => {
                resetForm()
                setSubmitted(false)
              }}
            >
              Oddaj novo povpraševanje
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                Oddajte povpraševanje
              </DialogTitle>
              <DialogDescription>Izpolnitev traja ~2 minuti</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="inq-storitev">Storitev *</Label>
                <Select
                  value={formData.storitev}
                  onValueChange={(val) => {
                    setFormData({ ...formData, storitev: val })
                    if (errors.storitev)
                      setErrors({ ...errors, storitev: "" })
                  }}
                >
                  <SelectTrigger
                    id="inq-storitev"
                    aria-invalid={!!errors.storitev}
                    className="min-h-[48px] text-[16px]"
                  >
                    <SelectValue placeholder="-- Izberi storitev --" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORITVE.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.storitev && (
                  <p className="text-xs text-destructive">{errors.storitev}</p>
                )}
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
                      if (
                        lokacijaInput.trim() &&
                        filteredLokacije.length > 0
                      ) {
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
                {errors.lokacija && (
                  <p className="text-xs text-destructive">{errors.lokacija}</p>
                )}
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
                        setErrors({
                          ...errors,
                          email: "Vnesite e-poštni naslov",
                        })
                      } else if (!validateEmail(formData.email)) {
                        setErrors({
                          ...errors,
                          email: "Nepravilen e-poštni naslov",
                        })
                      }
                    }}
                    className="pl-10 min-h-[48px] text-[16px]"
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
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
                    value={formData.telefon}
                    onChange={(e) => {
                      setFormData({ ...formData, telefon: e.target.value })
                      if (errors.telefon)
                        setErrors({ ...errors, telefon: "" })
                    }}
                    onBlur={() => {
                      if (!formData.telefon.trim()) {
                        setErrors({
                          ...errors,
                          telefon: "Vnesite telefonsko številko",
                        })
                      } else if (!validatePhone(formData.telefon)) {
                        setErrors({
                          ...errors,
                          telefon:
                            "Nepravilna telefonska številka (npr. +386 41 123 456)",
                        })
                      }
                    }}
                    className="pl-10 min-h-[48px] text-[16px]"
                    aria-invalid={!!errors.telefon}
                  />
                </div>
                {errors.telefon && (
                  <p className="text-xs text-destructive">{errors.telefon}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="inq-datum">Željeni datum dela</Label>
                <Input
                  id="inq-datum"
                  type="date"
                  value={formData.zeljeniDatum}
                  onChange={(e) =>
                    setFormData({ ...formData, zeljeniDatum: e.target.value })
                  }
                  className="min-h-[48px] text-[16px]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="inq-opis">Opis dela *</Label>
                <textarea
                  id="inq-opis"
                  placeholder="Kaj natančno potrebujete? (max 500 znakov)"
                  value={formData.opis}
                  onChange={(e) => {
                    setFormData({ ...formData, opis: e.target.value })
                    if (errors.opis) setErrors({ ...errors, opis: "" })
                  }}
                  onBlur={() => {
                    if (!formData.opis.trim()) {
                      setErrors({
                        ...errors,
                        opis: "Opis dela je obvezen",
                      })
                    }
                  }}
                  rows={4}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-invalid={!!errors.opis}
                />
                <div className="flex justify-between">
                  <p className="text-xs text-muted-foreground">
                    Opis je obvezen
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formData.opis.length}/500
                  </p>
                </div>
                {errors.opis && (
                  <p className="text-xs text-destructive">{errors.opis}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="inq-gdpr"
                  checked={gdprChecked}
                  onCheckedChange={(checked) => {
                    setGdprChecked(checked as boolean)
                    if (checked && errors.gdpr)
                      setErrors({ ...errors, gdpr: "" })
                  }}
                />
                <Label htmlFor="inq-gdpr" className="text-xs cursor-pointer">
                  Soglašam s hranjenjem mojih podatkov in pogoji uporabe *
                </Label>
              </div>
              {errors.gdpr && (
                <p className="text-xs text-destructive">{errors.gdpr}</p>
              )}
              {errors.submit && (
                <p className="text-sm text-destructive">{errors.submit}</p>
              )}
              <Button type="submit" size="lg" disabled={isLoading} className="w-full min-h-[48px]">
                {isLoading ? "Pošiljam..." : "Oddaj povpraševanje"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
