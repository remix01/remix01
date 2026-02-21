'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegistracijaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setError('Ime in priimek je obvezno.')
      return false
    }
    if (!email.trim()) {
      setError('Email je obvezan.')
      return false
    }
    if (!password.trim()) {
      setError('Geslo je obvezno.')
      return false
    }
    if (password.length < 8) {
      setError('Geslo mora biti najmanj 8 znakov.')
      return false
    }
    if (!locationCity.trim()) {
      setError('Mesto je obvezno.')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Sign up with email and password
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message || 'Napaka pri registraciji. Poskusite znova.')
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Napaka pri registraciji. Poskusite znova.')
        setLoading(false)
        return
      }

      // Insert profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            role: 'narocnik',
            full_name: fullName,
            phone: phone || null,
            location_city: locationCity,
          },
        ])

      if (insertError) {
        setError('Napaka pri ustvarjanju profila. Poskusite znova.')
        setLoading(false)
        return
      }

      // Redirect to dashboard
      router.push('/narocnik/dashboard')
    } catch (err) {
      setError('Napaka pri registraciji. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Ustvari račun</h2>
        <p className="text-muted-foreground">Brezplačna registracija za naročnike</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Ime in priimek</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Janez Novak"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="vam@primer.si"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Geslo (min. 8 znakov)</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+386 31 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationCity">Mesto</Label>
          <Input
            id="locationCity"
            type="text"
            placeholder="Ljubljana"
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Registriram se...' : 'Ustvari račun'}
        </Button>
      </form>

      <div className="space-y-2 text-sm text-center">
        <div>
          <span className="text-muted-foreground">Že imaš račun? </span>
          <Link href="/prijava" className="text-primary hover:underline font-medium">
            Prijava →
          </Link>
        </div>
        <div>
          <span className="text-muted-foreground">Ste obrtnik? </span>
          <Link href="/partner-auth/sign-up" className="text-primary hover:underline font-medium">
            Registracija za partnerje →
          </Link>
        </div>
      </div>
    </div>
  )
}
