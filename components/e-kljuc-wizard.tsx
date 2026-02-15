"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  Lock,
  Wifi,
  Key,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react"
import { format } from "date-fns"
import { sl } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface EKljucWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AccessMethod = "pin" | "smart-lock" | "physical-key"

export function EKljucWizard({ open, onOpenChange }: EKljucWizardProps) {
  const [step, setStep] = useState(1)
  const [accessMethod, setAccessMethod] = useState<AccessMethod>("pin")
  
  // Step 2 - Access setup
  const [pinCode, setPinCode] = useState("")
  const [pinCopied, setPinCopied] = useState(false)
  const [singleUse, setSingleUse] = useState(true)
  const [smartDevice, setSmartDevice] = useState("")
  const [deviceKey, setDeviceKey] = useState("")
  const [pickupInstructions, setPickupInstructions] = useState("")
  const [pickupAddress, setPickupAddress] = useState("")
  
  // Step 3 - Time window
  const [accessDate, setAccessDate] = useState<Date>()
  const [timeFrom, setTimeFrom] = useState("08:00")
  const [timeTo, setTimeTo] = useState("18:00")
  const [allowDelay, setAllowDelay] = useState(true)
  
  // Step 4 - Confirmation
  const [mojsterEmail, setMojsterEmail] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const generatePin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    setPinCode(pin)
    setPinCopied(false)
  }

  const copyPin = () => {
    navigator.clipboard.writeText(pinCode)
    setPinCopied(true)
    setTimeout(() => setPinCopied(false), 2000)
  }

  const canProceedStep1 = accessMethod !== ""
  const canProceedStep2 =
    (accessMethod === "pin" && pinCode) ||
    (accessMethod === "smart-lock" && smartDevice && deviceKey) ||
    (accessMethod === "physical-key" && pickupInstructions && pickupAddress)
  const canProceedStep3 = accessDate && timeFrom && timeTo
  const canProceedStep4 = mojsterEmail && termsAccepted

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const resetWizard = () => {
    setStep(1)
    setAccessMethod("pin")
    setPinCode("")
    setSingleUse(true)
    setSmartDevice("")
    setDeviceKey("")
    setPickupInstructions("")
    setPickupAddress("")
    setAccessDate(undefined)
    setTimeFrom("08:00")
    setTimeTo("18:00")
    setAllowDelay(true)
    setMojsterEmail("")
    setTermsAccepted(false)
    setSubmitted(false)
    onOpenChange(false)
  }

  const accessMethodOptions = [
    {
      value: "pin" as AccessMethod,
      icon: Lock,
      title: "Enkratna PIN koda",
      description: "Ustvarite 6-mestno kodo veljavno samo za dogovorjeni termin",
      badge: "Najpogosteje izbrano",
    },
    {
      value: "smart-lock" as AccessMethod,
      icon: Wifi,
      title: "Smart Lock integracija",
      description: "Kompatibilno z: Yale, Nuki, Danalock, Schlage",
      badge: "Priporočeno",
    },
    {
      value: "physical-key" as AccessMethod,
      icon: Key,
      title: "Fizični ključ pri sosedu",
      description: "Mojster prevzame ključ na dogovorjenem naslovu",
      badge: null,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Aktiviraj E-Ključ
              </DialogTitle>
              <DialogDescription>
                Korak {step} od 4 - Nastavite varen dostop za mojstra
              </DialogDescription>
            </DialogHeader>

            {/* Progress indicator */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    s <= step ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Step 1: Choose access method */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Izberite način dostopa</h3>
                <RadioGroup
                  value={accessMethod}
                  onValueChange={(v) => setAccessMethod(v as AccessMethod)}
                  className="space-y-3"
                >
                  {accessMethodOptions.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-primary/50",
                        accessMethod === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <RadioGroupItem value={option.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <option.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{option.title}</span>
                              {option.badge && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                  {option.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground ml-[52px]">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Step 2: Setup access */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">
                  Nastavitev dostopa -{" "}
                  {accessMethodOptions.find((o) => o.value === accessMethod)?.title}
                </h3>

                {accessMethod === "pin" && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/30 p-6">
                      {!pinCode ? (
                        <Button onClick={generatePin} size="lg" className="gap-2">
                          <Lock className="h-4 w-4" />
                          Generiraj PIN
                        </Button>
                      ) : (
                        <>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              Vaša PIN koda
                            </p>
                            <div className="font-mono text-5xl font-bold tracking-widest text-primary">
                              {pinCode}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={copyPin}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              {pinCopied ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Kopirano
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Kopiraj
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={generatePin}
                              variant="outline"
                              size="sm"
                            >
                              Generiraj novo
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="single-use"
                        checked={singleUse}
                        onCheckedChange={(checked) => setSingleUse(checked === true)}
                      />
                      <Label htmlFor="single-use" className="font-normal">
                        Enkratna uporaba (priporočeno)
                      </Label>
                    </div>
                  </div>
                )}

                {accessMethod === "smart-lock" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="smart-device">Izberi napravo *</Label>
                      <Select value={smartDevice} onValueChange={setSmartDevice}>
                        <SelectTrigger id="smart-device">
                          <SelectValue placeholder="Izberi tip ključavnice..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yale-connect">Yale Connect</SelectItem>
                          <SelectItem value="nuki-bridge">Nuki Bridge</SelectItem>
                          <SelectItem value="danalock-v3">Danalock V3</SelectItem>
                          <SelectItem value="schlage-encode">Schlage Encode</SelectItem>
                          <SelectItem value="other">Ostalo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="device-key">API ključ / koda naprave *</Label>
                      <Input
                        id="device-key"
                        type="text"
                        placeholder="Vnesite API ključ ali ID naprave"
                        value={deviceKey}
                        onChange={(e) => setDeviceKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Najdete ga v aplikaciji vaše pametne ključavnice pod
                        nastavitvami
                      </p>
                    </div>
                  </div>
                )}

                {accessMethod === "physical-key" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pickup-instructions">
                        Navodila za prevzem ključa *
                      </Label>
                      <Textarea
                        id="pickup-instructions"
                        placeholder="npr. Ključ je pri sosedi Mariji v 1. nadstropju, zvonec št. 5"
                        value={pickupInstructions}
                        onChange={(e) => setPickupInstructions(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pickup-address">Naslov prevzema *</Label>
                      <Input
                        id="pickup-address"
                        type="text"
                        placeholder="Ulica in hišna številka"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Time window */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Določite časovno okno</h3>
                
                <div className="space-y-2">
                  <Label>Datum dostopa *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !accessDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {accessDate ? (
                          format(accessDate, "PPP", { locale: sl })
                        ) : (
                          <span>Izberi datum</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={accessDate}
                        onSelect={setAccessDate}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time-from">Od (ura) *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="time-from"
                        type="time"
                        value={timeFrom}
                        onChange={(e) => setTimeFrom(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time-to">Do (ura) *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="time-to"
                        type="time"
                        value={timeTo}
                        onChange={(e) => setTimeTo(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1">
                    <Label htmlFor="allow-delay" className="font-normal">
                      Dovoli ± 30 min zamude
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mojster lahko pride do 30 min prej ali pozneje
                    </p>
                  </div>
                  <Switch
                    id="allow-delay"
                    checked={allowDelay}
                    onCheckedChange={setAllowDelay}
                  />
                </div>

                <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Varnostno opozorilo
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Dostop bo samodejno preklican po izteku določenega časa.
                      PIN koda ali digitalni dostop ne bosta več delovala.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review and confirmation */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Pregled in potrditev</h3>

                {/* Summary */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">Način dostopa</p>
                      <p className="text-sm text-muted-foreground">
                        {
                          accessMethodOptions.find((o) => o.value === accessMethod)
                            ?.title
                        }
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                    >
                      Uredi
                    </Button>
                  </div>

                  {accessMethod === "pin" && pinCode && (
                    <div>
                      <p className="text-sm font-medium">PIN koda</p>
                      <p className="text-sm font-mono text-muted-foreground">
                        {pinCode}
                      </p>
                    </div>
                  )}

                  {accessMethod === "smart-lock" && (
                    <div>
                      <p className="text-sm font-medium">Naprava</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {smartDevice.replace("-", " ")}
                      </p>
                    </div>
                  )}

                  {accessMethod === "physical-key" && (
                    <div>
                      <p className="text-sm font-medium">Naslov prevzema</p>
                      <p className="text-sm text-muted-foreground">
                        {pickupAddress}
                      </p>
                    </div>
                  )}

                  <div className="flex items-start justify-between border-t pt-3">
                    <div>
                      <p className="text-sm font-medium">Časovno okno</p>
                      <p className="text-sm text-muted-foreground">
                        {accessDate && format(accessDate, "PPP", { locale: sl })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {timeFrom} - {timeTo}
                        {allowDelay && " (± 30 min)"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(3)}
                    >
                      Uredi
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mojster-email">Email mojstra</Label>
                  <Input
                    id="mojster-email"
                    type="email"
                    placeholder="mojster@email.com"
                    value={mojsterEmail}
                    onChange={(e) => setMojsterEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Navodila za dostop bodo poslana na ta email naslov
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Checkbox
                    id="terms-ekljuc"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <Label htmlFor="terms-ekljuc" className="font-normal text-sm leading-relaxed">
                    Strinjam se s{" "}
                    <a href="/terms" className="underline hover:text-primary">
                      pogoji varnega dostopa
                    </a>{" "}
                    in potrjujem, da sem lastnik/upravitelj objekta ter imam
                    pravico podeliti dostop tretjim osebam.
                  </Label>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-4 border-t">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Nazaj
                </Button>
              )}
              <div className="flex-1" />
              {step < 4 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !canProceedStep1) ||
                    (step === 2 && !canProceedStep2) ||
                    (step === 3 && !canProceedStep3)
                  }
                  className="gap-2"
                >
                  Naprej
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceedStep4}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Aktiviraj E-Ključ
                </Button>
              )}
            </div>
          </>
        ) : (
          // Success screen
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-display text-2xl font-bold">
                E-Ključ uspešno aktiviran!
              </h3>
              <p className="text-muted-foreground max-w-md">
                Navodila za dostop so bila poslana mojstru na email{" "}
                <span className="font-medium text-foreground">{mojsterEmail}</span>
              </p>
            </div>

            <div className="w-full rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Vaš dostop je varen</p>
                  <p className="text-xs text-muted-foreground">
                    Šifriran in časovno omejen
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    {accessDate && format(accessDate, "PPP", { locale: sl })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {timeFrom} - {timeTo}
                  </p>
                </div>
              </div>
              {accessMethod === "pin" && pinCode && (
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">PIN: {pinCode}</p>
                    <p className="text-xs text-muted-foreground">
                      Enkratna uporaba
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={resetWizard} className="w-full">
              Zapri
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
