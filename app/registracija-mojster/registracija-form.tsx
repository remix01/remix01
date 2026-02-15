'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronRight, Check, AlertCircle } from 'lucide-react'

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  repeatPassword: string
  companyName: string
  taxNumber: string
  specialization: string
  workArea: string
  planSelected: 'start' | 'pro'
  termsAccepted: boolean
  privacyAccepted: boolean
  newsAccepted: boolean
}

interface Errors {
  [key: string]: string
}

const specializations = [
  'Gradnja & adaptacije',
  'Vodovod & ogrevanje',
  'Elektrika & pametni sistemi',
  'Mizarstvo & kovinarstvo',
  'Zaključna dela',
  'Okna, vrata & senčila',
  'Okolica & zunanja ureditev',
  'Vzdrževanje & popravila',
  'Poslovne storitve',
]

export default function RegistracijaMojsterForm() {
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const stripeSuccess = searchParams.get('stripe') === 'success'
  const initialPlan = (searchParams.get('plan') as 'start' | 'pro') === 'pro' ? 'pro' : 'start'

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    repeatPassword: '',
    companyName: '',
    taxNumber: '',
    specialization: '',
    workArea: '',
    planSelected: initialPlan,
    termsAccepted: false,
    privacyAccepted: false,
    newsAccepted: false,
  })

  function validateStep(step: number): boolean {
    const newErrors: Errors = {}

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'Ime je obvezno'
      if (!formData.lastName.trim()) newErrors.lastName = 'Priimek je obvezno'
      if (!formData.email.includes('@')) newErrors.email = 'Vnesite veljavno e-pošto'
      if (!formData.phone.trim()) newErrors.phone = 'Telefonska številka je obvezna'
      if (formData.password.length < 8) newErrors.password = 'Geslo mora imeti vsaj 8 znakov'
      if (formData.password !== formData.repeatPassword) newErrors.repeatPassword = 'Gesli se ne ujemata'
    } else if (step === 2) {
      if (!formData.companyName.trim()) newErrors.companyName = 'Podjetje je obvezno'
      if (!formData.taxNumber.trim()) newErrors.taxNumber = 'Davčna številka je obvezna'
      if (!formData.specialization) newErrors.specialization = 'Izbira specialnosti je obvezna'
      if (!formData.workArea.trim()) newErrors.workArea = 'Območje dela je obvezno'
    } else if (step === 3) {
      if (!formData.termsAccepted) newErrors.termsAccepted = 'Sprejeti morate pogoje uporabe'
      if (!formData.privacyAccepted) newErrors.privacyAccepted = 'Sprejeti morate politiko zasebnosti'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  function handlePrevious() {
    setCurrentStep(currentStep - 1)
  }

  async function handleSubmit() {
    if (!validateStep(3)) return
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setIsSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.currentTarget
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.currentTarget as HTMLInputElement).checked : value,
    }))
  }

  if (isSuccess) {
    return (
      <main className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Registracija je uspešna!</h1>
            <p className="text-muted-foreground mb-6">
              Vaš račun je bil ustvarjen. Prejeli boste e-pošto s povezavo za potrditev.
            </p>
            <Button asChild className="w-full">
              <Link href="/">Nazaj na domačo stran</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Banner */}
          {stripeSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Plačilo PRO naročnine je uspešno!</h3>
                <p className="text-sm text-green-700 mt-1">
                  Nadaljujte z registracijo. PRO paket je že aktiviran.
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                      step <= currentStep
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step < currentStep ? <Check className="h-5 w-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step < currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground text-center">
              Korak {currentStep} od 3
            </div>
          </div>

          {/* Form */}
          <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
            {/* Step 1: Personal Data */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Osebni podatki</h2>
                <p className="text-muted-foreground mb-6">
                  Vnesite svoje osnovne podatke za registracijo.
                </p>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Ime</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={errors.firstName ? 'border-red-500' : ''}
                        placeholder="Janez"
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Priimek</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={errors.lastName ? 'border-red-500' : ''}
                        placeholder="Novak"
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">E-pošta</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? 'border-red-500' : ''}
                      placeholder="janez@primer.si"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefonska številka</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={errors.phone ? 'border-red-500' : ''}
                      placeholder="+386 1 234 5678"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password">Geslo</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={errors.password ? 'border-red-500' : ''}
                        placeholder="••••••••"
                      />
                      {errors.password && (
                        <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="repeatPassword">Ponovi geslo</Label>
                      <Input
                        id="repeatPassword"
                        name="repeatPassword"
                        type="password"
                        value={formData.repeatPassword}
                        onChange={handleInputChange}
                        className={errors.repeatPassword ? 'border-red-500' : ''}
                        placeholder="••••••••"
                      />
                      {errors.repeatPassword && (
                        <p className="text-red-500 text-sm mt-1">{errors.repeatPassword}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <Button onClick={handleNext} className="gap-2">
                    Naprej <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Company Information */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Podatki o podjetju</h2>
                <p className="text-muted-foreground mb-6">
                  Povejte nam o svojem obrtnem delovanju.
                </p>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="companyName">Podjetje / S.P.</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className={errors.companyName ? 'border-red-500' : ''}
                      placeholder="Novak d.o.o."
                    />
                    {errors.companyName && (
                      <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="taxNumber">Davčna številka</Label>
                    <Input
                      id="taxNumber"
                      name="taxNumber"
                      value={formData.taxNumber}
                      onChange={handleInputChange}
                      className={errors.taxNumber ? 'border-red-500' : ''}
                      placeholder="SI12345678"
                    />
                    {errors.taxNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.taxNumber}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="specialization">Specialnost</Label>
                    <Select value={formData.specialization} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, specialization: value }))
                    }>
                      <SelectTrigger className={errors.specialization ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Izberite specialnost" />
                      </SelectTrigger>
                      <SelectContent>
                        {specializations.map(spec => (
                          <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.specialization && (
                      <p className="text-red-500 text-sm mt-1">{errors.specialization}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="workArea">Območje dela</Label>
                    <Input
                      id="workArea"
                      name="workArea"
                      value={formData.workArea}
                      onChange={handleInputChange}
                      className={errors.workArea ? 'border-red-500' : ''}
                      placeholder="npr. Ljubljana, Domžale, Kamnik"
                    />
                    {errors.workArea && (
                      <p className="text-red-500 text-sm mt-1">{errors.workArea}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button onClick={handlePrevious} variant="outline">
                    Nazaj
                  </Button>
                  <Button onClick={handleNext} className="gap-2">
                    Naprej <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Plan Selection & Agreements */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Izbira paketa in soglasja</h2>
                <p className="text-muted-foreground mb-6">
                  {stripeSuccess ? 'PRO naročnina je že aktivna.' : 'Izberite paket in sprejmite pogoje.'}
                </p>

                <div className="space-y-5">
                  {/* Plan Selection */}
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        formData.planSelected === 'start'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                      onClick={() => !stripeSuccess && setFormData(prev => ({ ...prev, planSelected: 'start' }))}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="plan"
                          value="start"
                          checked={formData.planSelected === 'start'}
                          onChange={() => setFormData(prev => ({ ...prev, planSelected: 'start' }))}
                          disabled={stripeSuccess}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-bold">START - Brezplačno</h3>
                          <p className="text-sm text-muted-foreground">10% provizija</p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        formData.planSelected === 'pro'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                      onClick={() => !stripeSuccess && setFormData(prev => ({ ...prev, planSelected: 'pro' }))}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="plan"
                          value="pro"
                          checked={formData.planSelected === 'pro'}
                          onChange={() => setFormData(prev => ({ ...prev, planSelected: 'pro' }))}
                          disabled={stripeSuccess}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">PRO - 29 EUR/mesec</h3>
                            {stripeSuccess && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                                <Check className="h-3 w-3" /> Aktivno
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">5% provizija, prioritetni prikaz</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agreements */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={formData.termsAccepted}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ ...prev, termsAccepted: checked as boolean }))
                        }
                      />
                      <label htmlFor="terms" className="text-sm text-foreground cursor-pointer">
                        Sprejmem{' '}
                        <Link href="/terms" className="text-primary hover:underline" target="_blank">
                          pogoje uporabe
                        </Link>
                      </label>
                    </div>
                    {errors.termsAccepted && (
                      <p className="text-red-500 text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {errors.termsAccepted}
                      </p>
                    )}

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="privacy"
                        checked={formData.privacyAccepted}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ ...prev, privacyAccepted: checked as boolean }))
                        }
                      />
                      <label htmlFor="privacy" className="text-sm text-foreground cursor-pointer">
                        Sprejmem{' '}
                        <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                          politiko zasebnosti
                        </Link>
                      </label>
                    </div>
                    {errors.privacyAccepted && (
                      <p className="text-red-500 text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {errors.privacyAccepted}
                      </p>
                    )}

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="newsletter"
                        checked={formData.newsAccepted}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ ...prev, newsAccepted: checked as boolean }))
                        }
                      />
                      <label htmlFor="newsletter" className="text-sm text-foreground cursor-pointer">
                        Želim prejemati novice in priporočila
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button onClick={handlePrevious} variant="outline">
                    Nazaj
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? 'Preusmerjam...' : 'Zaključi registracijo'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Že imate račun?{' '}
            <Link href="/prijava" className="text-primary hover:underline">
              Prijavite se
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </main>
  )
}
