'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import type { Profile, ObrtnikProfile } from '@/types/liftgo.types'

export default function ObrtnikProfilPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [obrtnikProfile, setObrtnikProfile] = useState<ObrtnikProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    location_city: '',
    location_region: '',
    company_name: '',
    description: '',
    specialties: '',
    website: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      const { data: obrtnikData } = await supabase
        .from('obrtnik_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      setObrtnikProfile(obrtnikData)

      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        avatar_url: profileData.avatar_url || '',
        location_city: profileData.location_city || '',
        location_region: profileData.location_region || '',
        company_name: obrtnikData?.company_name || '',
        description: obrtnikData?.description || '',
        specialties: obrtnikData?.specialties || '',
        website: obrtnikData?.website || '',
      })
    } catch (err) {
      console.error('[v0] Error loading profile:', err)
      setError(err instanceof Error ? err.message : 'Napaka pri nalaganju profila')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niste prijavljeni')

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url || null,
          location_city: formData.location_city,
          location_region: formData.location_region || null,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update or insert obrtnik_profiles
      const obrtnikData = {
        user_id: user.id,
        company_name: formData.company_name || null,
        description: formData.description || null,
        specialties: formData.specialties || null,
        website: formData.website || null,
      }

      if (obrtnikProfile) {
        const { error: obrtnikError } = await supabase
          .from('obrtnik_profiles')
          .update(obrtnikData)
          .eq('user_id', user.id)

        if (obrtnikError) throw obrtnikError
      } else {
        const { error: obrtnikError } = await supabase
          .from('obrtnik_profiles')
          .insert(obrtnikData)

        if (obrtnikError) throw obrtnikError
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await loadProfile()
    } catch (err) {
      console.error('[v0] Error saving profile:', err)
      setError(err instanceof Error ? err.message : 'Napaka pri shranjevanju')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Moj profil
        </h1>
        <p className="mt-2 text-muted-foreground">
          Uredite svoj profil in informacije o podjetju
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Profil uspešno shranjen</AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="mb-4 font-semibold text-foreground">Osebni podatki</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Polno ime</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefonska številka</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">URL slike profila</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://..."
                  disabled={isSaving}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location_city">Mesto</Label>
                  <Input
                    id="location_city"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location_region">Regija</Label>
                  <Input
                    id="location_region"
                    value={formData.location_region}
                    onChange={(e) => setFormData({ ...formData, location_region: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="mb-4 font-semibold text-foreground">Podatki o podjetju</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Ime podjetja</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="npr. Moje podjetje d.o.o."
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis dejavnosti</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kratko opišite svojo dejavnost, izkušnje..."
                  rows={4}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialties">Specialnosti</Label>
                <Input
                  id="specialties"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="npr. Keramika, Sanitarna oprema"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Spletna stran</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {obrtnikProfile && (
            <div className="border-t pt-6">
              <h3 className="mb-2 font-semibold text-foreground">Statistika</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Povprečna ocena</p>
                  <p className="text-lg font-semibold text-foreground">
                    {obrtnikProfile.avg_rating ? obrtnikProfile.avg_rating.toFixed(1) : '-'} ⭐
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Število ocen</p>
                  <p className="text-lg font-semibold text-foreground">
                    {obrtnikProfile.review_count || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Shranjevanje...
              </>
            ) : (
              'Shrani spremembe'
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}
