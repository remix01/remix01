"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Phone, Mail } from "lucide-react"
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
import { STORITVE, LOKACIJE } from "@/lib/constants/hero"

interface HeroFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill service from the inline hero form */
  initialService?: string
  /** Pre-fill location from the inline hero form */
  initialLokacija?: string
}

const EMPTY_FORM = {
  storitev: "",
  lokacija: "",
  email: "",
  telefon: "",
  zeljeniDatum: "",
  opis: "",
}

function validatePhone(phone: string) {
  const cleaned = phone.replace(/\s/g, "")
  return /^(\+386|0)[0-9]{8,9}$/.test(cleaned)
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function HeroFormDialog({
  open,
  onOpenChange,
  initialService = "",
  initialLokacija = "",
}: HeroFormDialogProps) {
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [gdprChecked, setGdprChecked] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [showLokacijaSuggestions, setShowLokacijaSuggestions] = useState(false)
  const [lokacijaInput, setLokacijaInput] = useState("")
  const [filteredLokacije, setFilteredLokacije] = useState<string[]>([])

  // Sync pre-filled values when dialog opens
  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        storitev: initialService || prev.storitev,
        lokacija: initialLokacija || prev.lokacija,
      }))
      setLokacijaInput(initialLokacija || "")
    }
  }, [open, initialService, initialLokacija])

  const handleLokacijaChange = (value: string) => {
    setLokacijaInput(value)
    setFormData((prev) => ({ ...prev, lokacija: value }))
    if (errors.lokacija) setErrors((prev) => ({ ...prev, lokacija: "" }))

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
    setFormData((prev) => ({ ...prev, lokacija }))
    setShowLokacijaSuggestions(false)
    if (errors.lokacija) setErrors((prev) => ({ ...prev, lokacija: "" }))
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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Napaka pri oddaji povpraševanja")
      }

      setSubmitted(true)
    } catch (error) {
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
    setSubmitted(false)
    setGdprChecked(false)
    setErrors({})
    setFormData({ ...EMPTY_FORM })
    setLokacijaInput("")
    setShowLokacijaSuggestions(false)
    setFilteredLokacije([])
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm()
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              onClick={resetForm}
            >
              Oddaj novo povpraševanje
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Oddajte povpraševanje</DialogTitle>
              <DialogDescription>Izpolnitev traja ~2 minuti</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4" noValidate>
              <div className="grid gap-1.5">
                <Label htmlFor="inq-storitev">Storitev *</Label>
                <Select
                  value={formData.storitev}
                  onValueChange={(val) => {
                    setFormData((prev) => ({ ...prev, storitev: val }))
                    if (errors.storitev) setErrors((prev) => ({ ...prev, storitev: "" }))
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
                  <p className="text-xs text-destructive" role="alert">{errors.storitev}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inq-lokacija">Lokacija *</Label>
                <div className="relative">
                  <Input
                    id="inq-lokacija"
                    type="text"
                    placeholder="npr. Ljubljana, Maribor, Celje..."
                    autoComplete="off"
                    value={lokacijaInput}
                    onChange={(e) => handleLokacijaChange(e.target.value)}
                    onFocus={() => {
                      if (lokacijaInput.trim() && filteredLokacije.length > 0) {
                        setShowLokacijaSuggestions(true)
                      }
                    }}
                    onBlur={() => {
                      requestAnimationFrame(() => setShowLokacijaSuggestions(false))
                    }}
                    aria-invalid={!!errors.lokacija}
                    className="min-h-[48px] text-[16px]"
                  />
                  {showLokacijaSuggestions && filteredLokacije.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
                      {filteredLokacije.map((lok) => (
                        <div
                          key={lok}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            selectLokacija(lok)
                          }}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          {lok}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.lokacija && (
                  <p className="text-xs text-destructive" role="alert">{errors.lokacija}</p>
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
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                      if (errors.email) setErrors((prev) => ({ ...prev, email: "" }))
                    }}
                    onBlur={() => {
                      if (!formData.email.trim()) {
                        setErrors((prev) => ({ ...prev, email: "Vnesite e-poštni naslov" }))
                      } else if (!validateEmail(formData.email)) {
                        setErrors((prev) => ({ ...prev, email: "Nepravilen e-poštni naslov" }))
                      }
                    }}
                    className="pl-10 min-h-[48px] text-[16px]"
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive" role="alert">{errors.email}</p>
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
                      setFormData((prev) => ({ ...prev, telefon: e.target.value }))
                      if (errors.telefon) setErrors((prev) => ({ ...prev, telefon: "" }))
                    }}
                    onBlur={() => {
                      if (!formData.telefon.trim()) {
                        setErrors((prev) => ({ ...prev, telefon: "Vnesite telefonsko številko" }))
                      } else if (!validatePhone(formData.telefon)) {
                        setErrors((prev) => ({ ...prev, telefon: "Nepravilna telefonska številka (npr. +386 41 123 456)" }))
                      }
                    }}
                    className="pl-10 min-h-[48px] text-[16px]"
                    aria-invalid={!!errors.telefon}
                  />
                </div>
                {errors.telefon && (
                  <p className="text-xs text-destructive" role="alert">{errors.telefon}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inq-datum">Željeni datum dela</Label>
                <Input
                  id="inq-datum"
                  type="date"
                  value={formData.zeljeniDatum}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, zeljeniDatum: e.target.value }))
                  }
                  className="min-h-[48px] text-[16px]"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inq-opis">Opis dela *</Label>
                <Textarea
                  id="inq-opis"
                  placeholder="Kaj natančno potrebujete? (max 500 znakov)"
                  value={formData.opis}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, opis: e.target.value }))
                    if (errors.opis) setErrors((prev) => ({ ...prev, opis: "" }))
                  }}
                  onBlur={() => {
                    if (!formData.opis.trim()) {
                      setErrors((prev) => ({ ...prev, opis: "Opis dela je obvezen" }))
                    }
                  }}
                  rows={4}
                  maxLength={500}
                  aria-invalid={!!errors.opis}
                />
                <div className="flex justify-between">
                  <p className="text-xs text-muted-foreground">Opis je obvezen</p>
                  <p className={`text-xs ${formData.opis.length > 480 ? "text-destructive" : "text-muted-foreground"}`}>
                    {formData.opis.length}/500
                  </p>
                </div>
                {errors.opis && (
                  <p className="text-xs text-destructive" role="alert">{errors.opis}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="inq-gdpr"
                  checked={gdprChecked}
                  onCheckedChange={(checked) => {
                    setGdprChecked(checked as boolean)
                    if (checked && errors.gdpr) setErrors((prev) => ({ ...prev, gdpr: "" }))
                  }}
                />
                <Label htmlFor="inq-gdpr" className="text-xs cursor-pointer">
                  Soglašam s hranjenjem mojih podatkov in pogoji uporabe *
                </Label>
              </div>
              {errors.gdpr && (
                <p className="text-xs text-destructive" role="alert">{errors.gdpr}</p>
              )}

              {errors.submit && (
                <p className="text-sm text-destructive" role="alert">{errors.submit}</p>
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
