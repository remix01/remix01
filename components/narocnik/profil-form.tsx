'use client'

import { useState } from 'react'
import type { Profile } from '@/types/marketplace'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfileAction } from '@/app/actions/profiles'

interface ProfilFormProps {
  profile: Profile
  userEmail: string
}

export default function ProfilForm({ profile, userEmail }: ProfilFormProps) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [locationCity, setLocationCity] = useState(profile.location_city || '')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const result = await updateProfileAction({
        full_name: fullName,
        phone,
        location_city: locationCity,
      })

      if (result.success) {
        setSuccessMessage('Profil posodobljen ✓')
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      } else {
        setErrorMessage(result.error || 'Napaka pri shranjevanju profila')
      }
    } catch (err) {
      setErrorMessage('Napaka pri shranjevanju profila. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="p-8">
        {successMessage && (
          <div className="mb-6 rounded-lg bg-green-100 p-4 text-green-900">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-900">
            {errorMessage}
          </div>
        )}

        {/* Email (Read-only) */}
        <div className="mb-6">
          <Label htmlFor="email" className="mb-2 block text-gray-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={userEmail}
            disabled
            className="bg-gray-100 text-gray-600"
          />
          <p className="mt-1 text-sm text-gray-500">
            Email naslova ni možno spremeniti
          </p>
        </div>

        {/* Full Name */}
        <div className="mb-6">
          <Label htmlFor="fullName" className="mb-2 block text-gray-700">
            Ime in priimek
          </Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Vaše ime in priimek"
          />
        </div>

        {/* Phone */}
        <div className="mb-6">
          <Label htmlFor="phone" className="mb-2 block text-gray-700">
            Telefon
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+386 1 234 5678"
          />
        </div>

        {/* Location City */}
        <div className="mb-6">
          <Label htmlFor="city" className="mb-2 block text-gray-700">
            Mesto
          </Label>
          <Input
            id="city"
            type="text"
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
            placeholder="Ljubljana"
          />
        </div>

        {/* Account Type */}
        <div className="mb-8 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Tip računa</p>
          <p className="font-semibold text-gray-900">Naročnik</p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300"
        >
          {loading ? 'Spreminjam...' : 'Shrani spremembe'}
        </Button>
      </Card>
    </form>
  )
}
