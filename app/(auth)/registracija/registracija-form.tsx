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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSignUp = async () => {
    if (selectedRole === 'obrtnik') {
      setError('Registracija obrtnikov z Google ni podprta. Prosimo, registrirajte se z emailom.')
      return
    }
    setGoogleLoading(true)
    setError('')
    try {
      const callbackUrl = `${window.location.origin}/auth/callback`
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl },
      })
    } catch {
      setError('Napaka pri registraciji z Google. Poskusite znova.')
      setGoogleLoading(false)
    }
  }

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

      // 1. Ustvari profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          role: selectedRole,
          full_name: fullName,
          phone: phone || null,
          location_city: locationCity,
          email: email,
        })

      if (profileError) {
        setError('Napaka pri ustvarjanju profila. Poskusite znova.')
        setLoading(false)
        return
      }

      // 2. Če je obrtnik, ustvari tudi obrtnik_profiles record
      if (selectedRole === 'obrtnik') {
        const { error: obrtnikError } = await supabase
          .from('obrtnik_profiles')
          .insert({
            id: data.user.id,
            business_name: fullName,
            is_verified: false,
            verification_status: 'pending',
            status: 'pending',
            avg_rating: 0,
            total_reviews: 0,
            is_available: true,
          })

        if (obrtnikError) {
          setError('Napaka pri ustvarjanju obrtnikovega profila.')
          setLoading(false)
          return
        }
      }

      // 3. Preusmeri glede na role
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

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Ustvari račun</h2>
        <p className="text-muted-foreground">Izberite, kaj vas zanima</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selector — PRVO v formi */}
        <div className="grid grid-cols-2 gap-3 mb-4">
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

        {selectedRole === 'narocnik' && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
            >
              <GoogleIcon />
              {googleLoading ? 'Registriram z Google...' : 'Registracija z Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ali z emailom</span>
              </div>
            </div>
          </>
        )}

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
      </div>
    </div>
  )
}
