'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CategoryCard } from '@/components/liftgo/CategoryCard'
import { Loader2, AlertCircle, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import type { Category, Urgency } from '@/types/liftgo.types'

export default function NovoPovprasevanjePage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    location_city: '',
    location_region: '',
    location_notes: '',
    urgency: 'normalno' as Urgency,
    preferred_date_from: '',
    preferred_date_to: '',
    budget_min: '',
    budget_max: '',
    no_budget: false,
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    setCategories(data || [])
  }

  const handleNext = () => {
    setError(null)

    if (step === 1 && !formData.category_id) {
      setError('Prosimo izberite kategorijo')
      return
    }

    if (step === 2 && (!formData.title || !formData.description)) {
      setError('Prosimo vnesite naslov in opis')
      return
    }

    if (step === 3 && !formData.location_city) {
      setError('Prosimo vnesite mesto')
      return
    }

    setStep(step + 1)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niste prijavljeni')

      const { data, error: insertError } = await supabase
        .from('povprasevanja')
        .insert({
          narocnik_id: user.id,
          category_id: formData.category_id,
          title: formData.title,
          description: formData.description,
          location_city: formData.location_city,
          location_region: formData.location_region,
          location_notes: formData.location_notes,
          urgency: formData.urgency,
          preferred_date_from: formData.preferred_date_from || null,
          preferred_date_to: formData.preferred_date_to || null,
          budget_min: formData.no_budget ? null : (formData.budget_min ? parseInt(formData.budget_min) : null),
          budget_max: formData.no_budget ? null : (formData.budget_max ? parseInt(formData.budget_max) : null),
          status: 'odprto',
        })
        .select()
        .single()

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        router.push(`/narocnik/povprasevanja/${data.id}`)
      }, 2000)
    } catch (err) {
      console.error('[v0] Error creating povprasevanje:', err)
      setError(err instanceof Error ? err.message : 'Napaka pri oddaji povpraševanja')
    } finally {
      setIsLoading(false)
    }
  }

  const progress = (step / 5) * 100

  if (success) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-12 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
            Povpraševanje oddano!
          </h2>
          <p className="mt-2 text-muted-foreground">
            Obrtniki bodo kmalu začeli pošiljati ponudbe
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Novo povpraševanje
        </h1>
        <p className="mt-2 text-muted-foreground">
          Korak {step} od 5
        </p>
        <Progress value={progress} className="mt-4" />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-foreground text-lg">Izberite kategorijo</h2>
              <p className="text-sm text-muted-foreground">Kaj potrebujete?</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  selected={formData.category_id === category.id}
                  onClick={() => setFormData({ ...formData, category_id: category.id })}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-foreground text-lg">Opišite delo</h2>
              <p className="text-sm text-muted-foreground">Bodite čim bolj podrobni</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Naslov *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="npr. Prenova kopalnice"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Opis *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Podrobno opišite kaj potrebujete, velikost prostora, materialne želje..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/1000 znakov
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-foreground text-lg">Lokacija</h2>
              <p className="text-sm text-muted-foreground">Kje bo delo potekalo?</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location_city">Mesto *</Label>
                <Input
                  id="location_city"
                  value={formData.location_city}
                  onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                  placeholder="Ljubljana"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_region">Regija</Label>
                <Input
                  id="location_region"
                  value={formData.location_region}
                  onChange={(e) => setFormData({ ...formData, location_region: e.target.value })}
                  placeholder="Osrednjeslovenska"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_notes">Dodatne informacije</Label>
              <Textarea
                id="location_notes"
                value={formData.location_notes}
                onChange={(e) => setFormData({ ...formData, location_notes: e.target.value })}
                placeholder="Natančen naslov, dostop, parkirišče..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Nujnost *</Label>
              <RadioGroup
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value as Urgency })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normalno" id="urgency-normalno" />
                  <Label htmlFor="urgency-normalno" className="font-normal cursor-pointer">
                    Normalno - v naslednjih tednih
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="kmalu" id="urgency-kmalu" />
                  <Label htmlFor="urgency-kmalu" className="font-normal cursor-pointer">
                    Kmalu - v naslednjih dneh
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nujno" id="urgency-nujno" />
                  <Label htmlFor="urgency-nujno" className="font-normal cursor-pointer">
                    Nujno - čim prej
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-foreground text-lg">Časovni okvir</h2>
              <p className="text-sm text-muted-foreground">Kdaj želite izvedbo?</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preferred_date_from">Začetek (po želji)</Label>
                <Input
                  id="preferred_date_from"
                  type="date"
                  value={formData.preferred_date_from}
                  onChange={(e) => setFormData({ ...formData, preferred_date_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_date_to">Konec (po želji)</Label>
                <Input
                  id="preferred_date_to"
                  type="date"
                  value={formData.preferred_date_to}
                  onChange={(e) => setFormData({ ...formData, preferred_date_to: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-foreground text-lg">Proračun</h2>
              <p className="text-sm text-muted-foreground">Koliko ste pripravljeni investirati?</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget_min">Minimalni proračun (€)</Label>
                <Input
                  id="budget_min"
                  type="number"
                  value={formData.budget_min}
                  onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                  placeholder="500"
                  disabled={formData.no_budget}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_max">Maksimalni proračun (€)</Label>
                <Input
                  id="budget_max"
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                  placeholder="2000"
                  disabled={formData.no_budget}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="no_budget"
                checked={formData.no_budget}
                onChange={(e) => setFormData({ ...formData, no_budget: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="no_budget" className="font-normal cursor-pointer">
                Ne vem / po dogovoru
              </Label>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazaj
            </Button>
          )}
          <Button
            onClick={step === 5 ? handleSubmit : handleNext}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Oddajanje...
              </>
            ) : step === 5 ? (
              'Oddaj povpraševanje'
            ) : (
              <>
                Naprej
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
