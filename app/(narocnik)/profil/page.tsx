'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import type { Profile } from '@/types/liftgo.types'

export default function NarocnikProfilPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
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
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        location_city: data.location_city || '',
        location_region: data.location_region || '',
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

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url || null,
          location_city: formData.location_city,
          location_region: formData.location_region || null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
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
          Uredite svoje osebne podatke
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
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
