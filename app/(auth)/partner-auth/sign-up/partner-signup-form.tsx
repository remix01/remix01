'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ChevronRight, AlertCircle, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  passwordConfirm: string
  businessName: string
  ajpesId: string
  tagline: string
  yearsExperience: number
  hourlyRate: number
  locationCity: string
}

interface Errors {
  [key: string]: string
}

export function PartnerSignUpForm() {
  const router = useRouter()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    businessName: '',
    ajpesId: '',
    tagline: '',
    yearsExperience: 0,
    hourlyRate: 0,
    locationCity: '',
  })

  // Password strength calculation
  const getPasswordStrength = (pwd: string): 'weak' | 'medium' | 'strong' => {
    if (pwd.length < 8) return 'weak'
    if (pwd.length < 12) return 'medium'
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 'strong'
    return 'medium'
  }

  const passwordStrength = getPasswordStrength(formData.password)

  function validateStep(step: number): boolean {
    const newErrors: Errors = {}

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'Ime je obvezno'
      if (!formData.lastName.trim()) newErrors.lastName = 'Priimek je obvezno'
      if (!formData.email.includes('@')) newErrors.email = 'Vnesite veljavno e-pošto'
      if (formData.password.length < 8) newErrors.password = 'Geslo mora imeti vsaj 8 znakov'
      if (formData.password !== formData.passwordConfirm) newErrors.passwordConfirm = 'Gesli se ne ujemata'
      if (!formData.phone.trim()) newErrors.phone = 'Telefon je obvezan'
    } else if (step === 2) {
      if (!formData.businessName.trim()) newErrors.businessName = 'Ime podjetja je obvezno'
      if (!formData.locationCity.trim()) newErrors.locationCity = 'Mesto je obvezno'
      if (formData.yearsExperience < 0) newErrors.yearsExperience = 'Leta izkušenj ne smejo biti negativna'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }))
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
    if (!validateStep(2)) return
    setIsSubmitting(true)

    try {
      // 1. Sign up with email and password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      })

      if (signUpError) {
        setErrors({ submit: signUpError.message || 'Napaka pri registraciji' })
        setIsSubmitting(false)
        return
      }

      if (!authData.user) {
        setErrors({ submit: 'Napaka pri ustvarjanju računa' })
        setIsSubmitting(false)
        return
      }

      // 2. Create profiles record
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        role: 'obrtnik',
        full_name: `${formData.firstName} ${formData.lastName}`,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        location_city: formData.locationCity,
      })

      if (profileError) {
        setErrors({ submit: 'Napaka pri ustvarjanju profila' })
        setIsSubmitting(false)
        return
      }

      // 3. Create obrtnik_profiles record
      const { error: obrtnikError } = await supabase
        .from('obrtnik_profiles')
        .insert({
          id: authData.user.id,
          business_name: formData.businessName,
          tagline: formData.tagline || null,
          ajpes_id: formData.ajpesId || null,
          years_experience: formData.yearsExperience,
          hourly_rate: formData.hourlyRate || null,
          verification_status: 'pending',
          status: 'pending',
          avg_rating: 0,
          total_reviews: 0,
          is_available: true,
        })

      if (obrtnikError) {
        setErrors({ submit: 'Napaka pri ustvarjanju obrtnikovega profila' })
        setIsSubmitting(false)
        return
      }

      // 4. Success - redirect to dashboard
      router.push('/obrtnik/dashboard?welcome=true')
    } catch (error) {
      console.error('[v0] Registration error:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Napaka pri registraciji',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm',
                  step <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step < currentStep ? <Check className="h-5 w-5" /> : step}
              </div>
              {step < 3 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2',
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground text-center">
          Korak {currentStep} od 3
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Step 1: Personal Data */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <Wrench className="w-6 h-6 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Osebni podatki</h2>
              <p className="text-sm text-muted-foreground">
                Vnesite svoje osnovne podatke
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ime</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Janez"
                    disabled={isSubmitting}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Priimek</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Novak"
                    disabled={isSubmitting}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="janez@primer.si"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+386 31 123 456"
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Geslo (min. 8 znakov)</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                {formData.password && (
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={cn(
                        'h-1.5 w-8 rounded-full',
                        passwordStrength === 'weak'
                          ? 'bg-red-500'
                          : passwordStrength === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      )}
                    />
                    <span
                      className={
                        passwordStrength === 'weak'
                          ? 'text-red-500'
                          : passwordStrength === 'medium'
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }
                    >
                      {passwordStrength === 'weak'
                        ? 'Šibko'
                        : passwordStrength === 'medium'
                          ? 'Srednje'
                          : 'Močno'}
                    </span>
                  </div>
                )}
                {errors.password && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Ponovi geslo</Label>
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  value={formData.passwordConfirm}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                {errors.passwordConfirm && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.passwordConfirm}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext} disabled={isSubmitting} className="gap-2">
                Naprej <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Company Information */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <Wrench className="w-6 h-6 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Podatki o podjetju</h2>
              <p className="text-sm text-muted-foreground">
                Povejte nam o svojem obrtnem delovanju
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Ime podjetja ali s.p.</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="npr. Novak d.o.o."
                  disabled={isSubmitting}
                />
                {errors.businessName && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.businessName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ajpesId">AJPES ID (fakultativno)</Label>
                <Input
                  id="ajpesId"
                  name="ajpesId"
                  value={formData.ajpesId}
                  onChange={handleInputChange}
                  placeholder="npr. 1234567000"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Kratek opis (fakultativno)</Label>
                <Input
                  id="tagline"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  placeholder="npr. Vodovodar z 10 let izkušenj"
                  maxLength={100}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.tagline.length}/100 znakov
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Leta izkušenj</Label>
                  <Input
                    id="yearsExperience"
                    name="yearsExperience"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.yearsExperience}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                  {errors.yearsExperience && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.yearsExperience}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Urna postavka (€, fakultativno)</Label>
                  <Input
                    id="hourlyRate"
                    name="hourlyRate"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.hourlyRate}
                    onChange={handleInputChange}
                    placeholder="npr. 25"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationCity">Mesto delovanja</Label>
                <Input
                  id="locationCity"
                  name="locationCity"
                  value={formData.locationCity}
                  onChange={handleInputChange}
                  placeholder="npr. Ljubljana, Domžale"
                  disabled={isSubmitting}
                />
                {errors.locationCity && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.locationCity}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <Button
                onClick={handlePrevious}
                variant="outline"
                disabled={isSubmitting}
              >
                Nazaj
              </Button>
              <Button onClick={handleNext} disabled={isSubmitting} className="gap-2">
                Naprej <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <Wrench className="w-6 h-6 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Pregled in potrditev</h2>
              <p className="text-sm text-muted-foreground">
                Preverite svoje podatke in zaključite registracijo
              </p>
            </div>

            {/* Review Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Ime:</p>
                  <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email:</p>
                  <p className="font-medium text-xs break-all">{formData.email}</p>
                </div>
              </div>

              <div className="border-t border-border pt-2">
                <p className="text-muted-foreground">Podjetje:</p>
                <p className="font-medium">{formData.businessName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Izkušnje:</p>
                  <p className="font-medium">{formData.yearsExperience} let</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mesto:</p>
                  <p className="font-medium">{formData.locationCity}</p>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>{errors.submit}</div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Po registraciji boste prejeli potrdilo na email. Vaš profil bo na voljo po
                pregledu skrbnika.
              </p>
            </div>

            <div className="flex justify-between gap-3">
              <Button
                onClick={handlePrevious}
                variant="outline"
                disabled={isSubmitting}
              >
                Nazaj
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? 'Registriranje...' : 'Dokončaj registracijo'}
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground">
              Že imate račun?{' '}
              <Link
                href="/partner-auth/login"
                className="text-primary hover:underline font-medium"
              >
                Prijavite se →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
