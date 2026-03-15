'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

type PartnerProfile = {
  id: string
  business_name: string
  description: string | null
  tagline: string | null
  hourly_rate: number | null
  years_experience: number | null
  service_radius_km: number | null
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  subscription_tier: 'start' | 'pro'
}

type UserProfile = {
  id: string
  email: string
  phone: string | null
  location_city: string | null
}

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    tagline: '',
    hourly_rate: '',
    years_experience: '',
    service_radius_km: '',
    website_url: '',
    facebook_url: '',
    instagram_url: '',
    phone: '',
    location_city: '',
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/partner-auth/login')
          return
        }

        // Fetch partner profile
        const { data: partnerData, error: partnerError } = await supabase
          .from('obrtnik_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (partnerError) throw partnerError

        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, email, phone, location_city')
          .eq('id', user.id)
          .maybeSingle()

        if (userError) throw userError

        if (partnerData) {
          setPartner(partnerData)
          setFormData({
            business_name: partnerData.business_name || '',
            description: partnerData.description || '',
            tagline: partnerData.tagline || '',
            hourly_rate: partnerData.hourly_rate ? partnerData.hourly_rate.toString() : '',
            years_experience: partnerData.years_experience ? partnerData.years_experience.toString() : '',
            service_radius_km: partnerData.service_radius_km ? partnerData.service_radius_km.toString() : '',
            website_url: partnerData.website_url || '',
            facebook_url: partnerData.facebook_url || '',
            instagram_url: partnerData.instagram_url || '',
            phone: userData?.phone || '',
            location_city: userData?.location_city || '',
          })
        }

        if (userData) {
          setUserProfile(userData)
        }
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError('Napaka pri nalaganju podatkov')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setSuccess(null)
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Update obrtnik_profiles
      const { error: partnerError } = await supabase
        .from('obrtnik_profiles')
        .update({
          business_name: formData.business_name,
          description: formData.description || null,
          tagline: formData.tagline || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
          service_radius_km: formData.service_radius_km ? parseInt(formData.service_radius_km) : null,
          website_url: formData.website_url || null,
          facebook_url: formData.facebook_url || null,
          instagram_url: formData.instagram_url || null,
        })
        .eq('id', user.id)

      if (partnerError) throw partnerError

      // Update profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: formData.phone || null,
          location_city: formData.location_city || null,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      setSuccess('Profil je bil uspešno posodobljen!')
      
      // Update local state
      setPartner(prev => prev ? {
        ...prev,
        business_name: formData.business_name,
        description: formData.description || null,
        tagline: formData.tagline || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        service_radius_km: formData.service_radius_km ? parseInt(formData.service_radius_km) : null,
        website_url: formData.website_url || null,
        facebook_url: formData.facebook_url || null,
        instagram_url: formData.instagram_url || null,
      } : null)
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Napaka pri shranjevanju profila')
    } finally {
      setSaving(false)
    }
  }

  const calculateCompletion = () => {
    const fields = [
      formData.business_name,
      formData.description,
      formData.tagline,
      formData.hourly_rate,
      formData.years_experience,
      formData.service_radius_km,
      formData.website_url,
      formData.facebook_url,
      formData.instagram_url,
      formData.phone,
      formData.location_city,
    ]
    const filled = fields.filter(f => f && f.toString().trim()).length
    return Math.round((filled / fields.length) * 100)
  }

  const completionPercentage = calculateCompletion()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <PartnerSidebar partner={partner || { business_name: 'Moj portal', subscription_tier: 'start', avg_rating: 0, is_verified: false }} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="mx-auto max-w-3xl p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Moj račun</h1>
            <p className="text-muted-foreground mt-2">Uredite podatke svojega profila in naročnino</p>
          </div>

          {/* Completion Progress */}
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Dokončanost profila: {completionPercentage}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Vaš profil je {completionPercentage}% izpolnjen. Izpolnite več podatkov za boljšo vidnost.
              </p>
            </CardContent>
          </Card>

          {/* Alerts */}
          {error && (
            <div className="mb-6 flex gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 flex gap-3 rounded-lg bg-green-50 p-4 text-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Profile Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Podatki podjetja</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="business_name">Ime podjetja *</Label>
                    <Input
                      id="business_name"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location_city">Mesto/Lokacija</Label>
                    <Input
                      id="location_city"
                      name="location_city"
                      value={formData.location_city}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tagline">Tagline (max 100 znakov)</Label>
                  <Input
                    id="tagline"
                    name="tagline"
                    maxLength={100}
                    placeholder="npr. Kakovostne storitve z izkušnjami"
                    value={formData.tagline}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{formData.tagline.length}/100</p>
                </div>

                <div>
                  <Label htmlFor="description">Opis podjetja</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Opišite vašo dejavnost, izkušnje in kaj vas razlikuje..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="hourly_rate">Urna postavka (€/h)</Label>
                    <Input
                      id="hourly_rate"
                      name="hourly_rate"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.hourly_rate}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="years_experience">Leta izkušenj</Label>
                    <Input
                      id="years_experience"
                      name="years_experience"
                      type="number"
                      placeholder="0"
                      value={formData.years_experience}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="service_radius_km">Polmer dela: {formData.service_radius_km || 50} km</Label>
                  <input
                    id="service_radius_km"
                    name="service_radius_km"
                    type="range"
                    min="5"
                    max="200"
                    value={formData.service_radius_km || 50}
                    onChange={handleSliderChange}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <Label>Spletne povezave</Label>
                  <div className="space-y-3 mt-3">
                    <div>
                      <Label htmlFor="website_url" className="text-xs text-muted-foreground">Spletna stran</Label>
                      <Input
                        id="website_url"
                        name="website_url"
                        type="url"
                        placeholder="https://example.com"
                        value={formData.website_url}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="facebook_url" className="text-xs text-muted-foreground">Facebook</Label>
                      <Input
                        id="facebook_url"
                        name="facebook_url"
                        type="url"
                        placeholder="https://facebook.com/..."
                        value={formData.facebook_url}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="instagram_url" className="text-xs text-muted-foreground">Instagram</Label>
                      <Input
                        id="instagram_url"
                        name="instagram_url"
                        type="url"
                        placeholder="https://instagram.com/..."
                        value={formData.instagram_url}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Telefonska številka</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+386 1 234 56 78"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Shranjevam...' : 'Shrani spremembe'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card>
            <CardHeader>
              <CardTitle>Naročnina</CardTitle>
              <CardDescription>Upravljajte vašo naročnino in paket</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trenutni paket</p>
                  <p className="text-xl font-bold mt-1">
                    {partner?.subscription_tier === 'pro' ? 'PRO plan' : 'START plan'}
                  </p>
                </div>
                <Link href="/partner-dashboard/account/narocnina">
                  <Button variant="outline">Upravljaj naročnino</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <PartnerBottomNav paket={{ paket: partner?.subscription_tier || 'start' }} />
    </div>
  )
}
