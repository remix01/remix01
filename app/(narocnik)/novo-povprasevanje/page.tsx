'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPovprasevanje } from '@/lib/dal/povprasevanja'
import { getActiveCategories } from '@/lib/dal/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import type { Category, UrgencyLevel, PovprasevanjeInsert } from '@/types/marketplace'
import * as LucideIcons from 'lucide-react'
import { Loader2 } from 'lucide-react'

// Helper to get icon component from name
function getIconComponent(iconName?: string) {
  if (!iconName) return null
  const iconKey = iconName.charAt(0).toUpperCase() + iconName.slice(1)
  return (LucideIcons as any)[iconKey] || null
}

export default function NovoPoVprasevanjePage() {
  const router = useRouter()
  const supabase = createClient()

  // Step state
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<UrgencyLevel>('normalno')
  const [locationCity, setLocationCity] = useState('')
  const [locationNotes, setLocationNotes] = useState('')
  const [preferredDateFrom, setPreferredDateFrom] = useState('')
  const [preferredDateTo, setPreferredDateTo] = useState('')
  const [budgetUndetermined, setBudgetUndetermined] = useState(true)
  const [budgetMin, setBudgetMin] = useState<number | ''>('')
  const [budgetMax, setBudgetMax] = useState<number | ''>('')

  // Fetch user and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      // Get user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/prijava')
        return
      }
      setUser(currentUser)

      // Fetch user profile to get location
      const { data: profile } = await supabase
        .from('profiles')
        .select('location_city')
        .eq('id', currentUser.id)
        .single()

      if (profile?.location_city) {
        setLocationCity(profile.location_city)
      }

      // Fetch categories
      const cats = await getActiveCategories()
      setCategories(cats)
    }

    fetchData()
  }, [supabase, router])

  // Validation functions
  const isStep1Valid = selectedCategory !== null
  const isStep2Valid = title.trim().length > 0 && description.length >= 20
  const isStep3Valid = locationCity.trim().length > 0

  // Handle next step
  const handleNext = () => {
    if (step === 1 && !isStep1Valid) return
    if (step === 2 && !isStep2Valid) return
    if (step === 3 && !isStep3Valid) return
    if (step < 4) {
      setStep(step + 1)
      setError(null)
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1)
      setError(null)
    }
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!user || !selectedCategory) return

    setLoading(true)
    setError(null)

    try {
      const povprasevanje: PovprasevanjeInsert = {
        narocnik_id: user.id,
        category_id: selectedCategory.id,
        title,
        description,
        urgency,
        location_city: locationCity,
        location_notes: locationNotes || undefined,
        preferred_date_from: preferredDateFrom || undefined,
        preferred_date_to: preferredDateTo || undefined,
        budget_min: !budgetUndetermined && budgetMin ? Number(budgetMin) : undefined,
        budget_max: !budgetUndetermined && budgetMax ? Number(budgetMax) : undefined,
      }

      const result = await createPovprasevanje(povprasevanje)

      if (!result) {
        setError('Napaka pri oddaji. Poskusite znova.')
        setLoading(false)
        return
      }

      // Success - redirect to povprasevanja page
      router.push(`/narocnik/povprasevanja/${result.id}`)
    } catch (err) {
      console.error('[v0] Error submitting povprasevanje:', err)
      setError('Napaka pri oddaji. Poskusite znova.')
      setLoading(false)
    }
  }

  const urgencyOptions: { value: UrgencyLevel; label: string; subtext: string }[] = [
    { value: 'normalno', label: '🟢 Normalno', subtext: 'V naslednjih dneh' },
    { value: 'kmalu', label: '🟡 Kmalu', subtext: 'Čim prej ta teden' },
    { value: 'nujno', label: '🔴 Nujno', subtext: 'Danes ali jutri' },
  ]

  // Progress bar calculation
  const progressValue = (step / 4) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 font-dm-sans mb-2">
            Novo povpraševanje
          </h1>
          <p className="text-slate-600">
            {step === 1 && 'Izberite vrsto dela'}
            {step === 2 && 'Opišite delo, ki ga potrebujete'}
            {step === 3 && 'Navedite lokacijo in termin'}
            {step === 4 && 'Preglejte in oddajte povpraševanje'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between mt-4">
            {['Kategorija', 'Opis', 'Lokacija', 'Pregled'].map((label, i) => (
              <div
                key={i}
                className={`flex flex-col items-center ${i + 1 === step ? 'text-teal-600' : i + 1 < step ? 'text-teal-600' : 'text-slate-400'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i + 1 === step
                      ? 'bg-teal-600 text-white'
                      : i + 1 < step
                        ? 'bg-teal-100 text-teal-600'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {i + 1}
                </div>
                <span className="text-xs mt-1 text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <Card className="mb-6 p-4 bg-red-50 border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </Card>
        )}

        {/* Step 1: Kategorija */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-4 block">Izberite kategorijo dela</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const IconComponent = getIconComponent(cat.icon_name)
                  const isSelected = selectedCategory?.id === cat.id

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-slate-200 bg-white hover:border-teal-300'
                      }`}
                    >
                      {IconComponent && <IconComponent className="w-6 h-6 text-teal-600" />}
                      <span className="text-xs text-center font-medium">{cat.name}</span>
                      {isSelected && (
                        <span className="absolute top-2 right-2">
                          <span className="inline-block w-5 h-5 bg-teal-600 rounded-full text-white text-xs flex items-center justify-center">
                            ✓
                          </span>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-8">
              <Button
                onClick={handleNext}
                disabled={!isStep1Valid}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Naprej →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Opis dela */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-sm font-medium mb-2 block">
                Naslov <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="npr. Popravilo puščajoče pipe v kuhinji"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium mb-2 block">
                Opis dela <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opišite problem čim bolj natančno. Navedite material, dostop, posebnosti..."
                minLength={20}
                className="min-h-32"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Najmanj 20 znakov ({description.length}/20)
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">
                Nujnost <span className="text-red-500">*</span>
              </Label>
              <RadioGroup value={urgency} onValueChange={(v) => setUrgency(v as UrgencyLevel)}>
                <div className="space-y-2">
                  {urgencyOptions.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`urgency-${opt.value}`} />
                      <label
                        htmlFor={`urgency-${opt.value}`}
                        className="flex-1 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex flex-col"
                      >
                        <span className="font-medium text-sm">{opt.label}</span>
                        <span className="text-xs text-slate-500">{opt.subtext}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between gap-2 mt-8">
              <Button onClick={handlePrevious} variant="outline">
                ← Nazaj
              </Button>
              <Button
                onClick={handleNext}
                disabled={!isStep2Valid}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Naprej →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Lokacija in termin */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="city" className="text-sm font-medium mb-2 block">
                Mesto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="npr. Ljubljana"
                required
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                Napotki za dostop
              </Label>
              <Input
                id="notes"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="npr. 3. nadstropje, brez dvigala, ozek hodnik"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom" className="text-sm font-medium mb-2 block">
                  Želeni začetek
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={preferredDateFrom}
                  onChange={(e) => setPreferredDateFrom(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dateTo" className="text-sm font-medium mb-2 block">
                  Želeni konec
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={preferredDateTo}
                  onChange={(e) => setPreferredDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-8">
              <Button onClick={handlePrevious} variant="outline">
                ← Nazaj
              </Button>
              <Button
                onClick={handleNext}
                disabled={!isStep3Valid}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Naprej →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Pregled in oddaja */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="p-6 bg-white border-slate-200">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">Pregled povpraševanja</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-slate-600 font-medium">Kategorija:</span>
                  <span className="text-slate-900 font-semibold">{selectedCategory?.name}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-600 font-medium">Naslov:</span>
                  <span className="text-slate-900 font-semibold text-right">{title}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-600 font-medium">Opis:</span>
                  <span className="text-slate-900 text-right line-clamp-3 max-w-xs">
                    {description}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-600 font-medium">Nujnost:</span>
                  <span className="text-slate-900 font-semibold">
                    {urgencyOptions.find((o) => o.value === urgency)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-600 font-medium">Lokacija:</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {locationCity}
                    {locationNotes && <div className="text-xs text-slate-500">{locationNotes}</div>}
                  </span>
                </div>
                {(preferredDateFrom || preferredDateTo) && (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-600 font-medium">Termin:</span>
                    <span className="text-slate-900 font-semibold">
                      {preferredDateFrom && <div>{preferredDateFrom}</div>}
                      {preferredDateTo && <div>do {preferredDateTo}</div>}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Budget section */}
            <Card className="p-6 bg-white border-slate-200">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">Proračun</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="budgetUndetermined"
                    checked={budgetUndetermined}
                    onCheckedChange={(checked) => setBudgetUndetermined(checked as boolean)}
                  />
                  <label htmlFor="budgetUndetermined" className="text-sm cursor-pointer">
                    Proračun ni določen / po dogovoru
                  </label>
                </div>

                {!budgetUndetermined && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="budgetMin" className="text-xs font-medium mb-1 block">
                        Min. proračun (EUR)
                      </Label>
                      <Input
                        id="budgetMin"
                        type="number"
                        min="0"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value ? Number(e.target.value) : '')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="budgetMax" className="text-xs font-medium mb-1 block">
                        Max. proračun (EUR)
                      </Label>
                      <Input
                        id="budgetMax"
                        type="number"
                        min="0"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value ? Number(e.target.value) : '')}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-between gap-2 mt-8">
              <Button onClick={handlePrevious} variant="outline">
                ← Nazaj
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Oddaja...
                  </>
                ) : (
                  'Oddaj povpraševanje ✓'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
