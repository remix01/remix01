'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, AlertCircle, User, Briefcase, ArrowRight, ArrowLeft } from 'lucide-react'
import { CategoryCard } from '@/components/liftgo/CategoryCard'
import type { Category } from '@/types/liftgo.types'

type Role = 'narocnik' | 'obrtnik'

export default function RegistracijaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    location_city: '',
    business_name: '',
    description: '',
  })

  // Load categories when reaching step 3 (for obrtnik)
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('[v0] Error loading categories:', err)
    }
  }

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole)
    setStep(2)
  }

  const handleNextStep = async () => {
    setError(null)

    if (step === 2) {
      if (!formData.email || !formData.password || !formData.full_name || !formData.phone || !formData.location_city) {
        setError('Prosimo izpolnite vsa obvezna polja')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Gesli se ne ujemata')
        return
      }
      if (formData.password.length < 8) {
        setError('Geslo mora biti dolgo najmanj 8 znakov')
        return
      }

      if (role === 'obrtnik') {
        await loadCategories()
        setStep(3)
      } else {
        await handleSubmit()
      }
    } else if (step === 3 && role === 'obrtnik') {
      if (!formData.business_name || selectedCategories.length === 0) {
        setError('Prosimo vnesite ime podjetja in izberite vsaj eno kategorijo')
        return
      }
      await handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Napaka pri ustvarjanju računa')

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: role!,
          full_name: formData.full_name,
          phone: formData.phone,
          location_city: formData.location_city,
        })

      if (profileError) throw profileError

      if (role === 'obrtnik') {
        const { error: obrnikError } = await supabase
          .from('obrtnik_profiles')
          .insert({
            profile_id: authData.user.id,
            business_name: formData.business_name,
            description: formData.description,
          })

        if (obrnikError) throw obrnikError

        const categoryInserts = selectedCategories.map(categoryId => ({
          obrtnik_id: authData.user.id,
          category_id: categoryId,
        }))

        const { error: categoriesError } = await supabase
          .from('obrtnik_categories')
          .insert(categoryInserts)

        if (categoriesError) throw categoriesError

        router.push('/obrtnik/dashboard')
      } else {
        router.push('/narocnik/dashboard')
      }
    } catch (err) {
      console.error('[v0] Registration error:', err)
      setError(err instanceof Error ? err.message : 'Napaka pri registraciji')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const progress = role === 'narocnik' ? (step / 2) * 100 : (step / 3) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Ustvarite račun</CardTitle>
        <CardDescription>
          {step === 1 && 'Izberite svojo vlogo'}
          {step === 2 && 'Osnovni podatki'}
          {step === 3 && 'Podatki o podjetju'}
        </CardDescription>
        {step > 1 && <Progress value={progress} className="mt-2" />}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => handleRoleSelect('narocnik')}
            >
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Iščem storitev</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Za naročnike storitev
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => handleRoleSelect('obrtnik')}
            >
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Briefcase className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Ponujam storitve</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Za obrtnike in mojstre
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Polno ime *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Janez Novak"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-poštni naslov *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ime@primer.si"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefonska številka *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+386 XX XXX XXX"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_city">Mesto *</Label>
              <Input
                id="location_city"
                value={formData.location_city}
                onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                placeholder="Ljubljana"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Geslo *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Najmanj 8 znakov"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potrdite geslo *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Ponovite geslo"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {step === 3 && role === 'obrtnik' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Ime podjetja *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Novak s.p."
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis dejavnosti</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Predstavite se in opišite svoje storitve..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Izberite kategorije storitev *</Label>
              <p className="text-sm text-muted-foreground">
                Izberite kategorije v katerih opravljate storitve
              </p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    selected={selectedCategories.includes(category.id)}
                    onClick={() => toggleCategory(category.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="flex w-full gap-2">
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
            onClick={handleNextStep}
            disabled={isLoading || (step === 1 && !role)}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ustvarjanje...
              </>
            ) : step === 2 && role === 'narocnik' ? (
              'Ustvari račun'
            ) : step === 3 ? (
              'Ustvari račun'
            ) : (
              <>
                Naprej
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {step === 1 && (
          <p className="text-center text-sm text-muted-foreground">
            Že imate račun?{' '}
            <Link href="/prijava" className="font-medium text-primary hover:underline">
              Prijavite se
            </Link>
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
