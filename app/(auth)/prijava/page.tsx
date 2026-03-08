'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function PrijavaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Sign in with email and password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Napačen email ali geslo. Preverite podatke.')
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Napaka pri prijavi. Poskusite znova.')
        setLoading(false)
        return
      }

      // Check for admin first (requires server-side access)
      // For now, skip admin check in client - it will be done server-side
      // The user will be redirected appropriately based on their profile role

      // Check for partner
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', data.user.id)
        .single()

      if (partner) {
        const redirectTo = searchParams.get('redirectTo') || searchParams.get('next') || searchParams.get('redirect')
        const safeRedirect = redirectTo?.startsWith('/') ? redirectTo : '/partner-dashboard'
        router.push(safeRedirect)
        return
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        router.push('/registracija')
        return
      }

      // Redirect based on role — with safe internal path validation
      const redirectTo = searchParams.get('redirectTo') || searchParams.get('next') || searchParams.get('redirect')
      
      if (profile.role === 'obrtnik') {
        const safeRedirect = redirectTo?.startsWith('/') ? redirectTo : '/obrtnik/dashboard'
        router.push(safeRedirect)
      } else {
        // Naročnik
        const safeRedirect = redirectTo?.startsWith('/') ? redirectTo : '/dashboard'
        router.push(safeRedirect)
      }
    } catch (err) {
      setError('Napaka pri prijavi. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Dobrodošli nazaj</h2>
        <p className="text-muted-foreground">Prijavite se v svoj račun</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Label htmlFor="password">Geslo</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Prijavljam se...' : 'Prijava'}
        </Button>
      </form>

      <div className="space-y-2 text-sm text-center">
        <div>
          <span className="text-muted-foreground">Nimaš računa? </span>
          <Link href="/registracija" className="text-primary hover:underline font-medium">
            Registriraj se →
          </Link>
        </div>
        <div>
          <span className="text-muted-foreground">Ste obrtnik? </span>
          <Link href="/partner-auth/login" className="text-primary hover:underline font-medium">
            Prijava za partnerje →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PrijavaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Nalaganje...</div>}>
      <PrijavaContent />
    </Suspense>
  )
}
