'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Search, Wrench } from 'lucide-react'
import type { UserRole } from '@/types'

export function RegistracijaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [selectedRole, setSelectedRole] = useState<UserRole>('narocnik')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [tosAccepted, setTosAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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
    if (!tosAccepted || !privacyAccepted) {
      setError('Sprejeti morate pogoje uporabe in politiko zasebnosti.')
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
      const response = await fetch('/api/registracija', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone,
          location_city: locationCity,
          role: selectedRole,
          tosAccepted,
          privacyAccepted,
        }),
      })

      if (!response.ok) {
        if (response.status === 409) {
          setError('Email že obstaja.')
          return
        }

        if (response.status === 429) {
          setError('Preveč poskusov, počakajte nekaj minut.')
          return
        }

        setError('Napaka pri registraciji. Poskusite znova.')
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Račun je ustvarjen, prijava pa ni uspela. Poskusite se prijaviti ročno.')
        return
      }

      if (selectedRole === 'obrtnik') {
        router.push('/partner-dashboard')
      } else {
        const redirect = searchParams?.get('redirect')
        router.push(redirect || '/dashboard')
      }
    } catch (err) {
      setError('Napaka pri registraciji. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setError('')

    if (!tosAccepted || !privacyAccepted) {
      setError('Za nadaljevanje morate sprejeti pogoje uporabe in politiko zasebnosti.')
      return
    }

    setGoogleLoading(true)

    try {
      // Persist the role choice across the OAuth redirect so the callback
      // can create the profiles row with the correct role.
      try { sessionStorage.setItem('oauth_intended_role', selectedRole) } catch {}

      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/prijava?oauth=google`,
        },
      })

      if (googleError) {
        setError('Google registracija trenutno ni na voljo. Poskusite znova.')
        setGoogleLoading(false)
      }
    } catch {
      setError('Napaka pri Google registraciji. Poskusite znova.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Ustvari račun</h2>
        <p className="text-muted-foreground">Izberite, kaj vas zanima</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selector — PRVO v formi */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setSelectedRole('narocnik')}
            className={cn(
              'rounded-[var(--radius)] border-2 p-4 text-left transition-all',
              selectedRole === 'narocnik'
                ? 'border-primary bg-secondary'
                : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <Search className="w-6 h-6 text-primary mb-2" />
            <div className="font-bold text-sm text-foreground">Iščem mojstra</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Oddajte povpraševanje
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('obrtnik')}
            className={cn(
              'rounded-[var(--radius)] border-2 p-4 text-left transition-all',
              selectedRole === 'obrtnik'
                ? 'border-primary bg-secondary'
                : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <Wrench className="w-6 h-6 text-primary mb-2" />
            <div className="font-bold text-sm text-foreground">
              Sem obrtnik / mojster
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Ponujam storitve
            </div>
          </button>
        </div>

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

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            disabled={loading}
            className="mt-0.5"
          />
          <span>
            Strinjam se s{' '}
            <Link href="/pogoji" className="underline">
              pogoji uporabe
            </Link>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            disabled={loading}
            className="mt-0.5"
          />
          <span>
            Strinjam se s{' '}
            <Link href="/politika-zasebnosti" className="underline">
              politiko zasebnosti
            </Link>
          </span>
        </label>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !tosAccepted || !privacyAccepted}
        >
          {loading ? 'Registriram se...' : 'Ustvari račun'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleRegister}
          disabled={loading || googleLoading || !tosAccepted || !privacyAccepted}
        >
          {googleLoading ? 'Preusmerjam na Google...' : 'Registracija z Google računom'}
        </Button>
      </form>

      <div className="space-y-2 text-sm text-center">
        <div>
          <span className="text-muted-foreground">Že imaš račun? </span>
          <Link href="/prijava" className="text-primary hover:underline font-medium">
            Prijava →
          </Link>
        </div>
      </div>
    </div>
  )
}
