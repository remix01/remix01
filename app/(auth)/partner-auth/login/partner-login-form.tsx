'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wrench } from 'lucide-react'

export function PartnerLoginContent() {
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

      // Check for custom redirect first
      const redirectTo = searchParams.get('redirectTo')
      if (redirectTo?.startsWith('/') && !redirectTo.startsWith('/partner-auth')) {
        router.push(redirectTo)
        return
      }

      // Fetch user profile to verify role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError || !profile) {
        router.push('/partner-auth/sign-up')
        return
      }

      // Verify that user is obrtnik
      if (profile.role === 'obrtnik') {
        router.push('/obrtnik/dashboard')
      } else {
        // Not a craftworker - redirect to regular login
        setError('Ta račun ni obrtniški račun. Prijavite se kot stranko.')
        setLoading(false)
        return
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
        <div className="flex justify-center mb-2">
          <Wrench className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Prijava za mojstre</h2>
        <p className="text-muted-foreground">Prijavite se v svoj obrtniški račun</p>
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
          <span className="text-muted-foreground">Stranka? </span>
          <Link href="/prijava" className="text-primary hover:underline font-medium">
            Prijava za stranke →
          </Link>
        </div>
        <div>
          <span className="text-muted-foreground">Še nimate računa? </span>
          <Link href="/partner-auth/sign-up" className="text-primary hover:underline font-medium">
            Registracija →
          </Link>
        </div>
      </div>
    </div>
  )
}
