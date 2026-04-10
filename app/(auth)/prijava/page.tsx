'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Wrench } from 'lucide-react'

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

function PrijavaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- Stranka state ---
  const [strankaEmail, setStrankaEmail] = useState('')
  const [strankaPassword, setStrankaPassword] = useState('')
  const [strankaError, setStrankaError] = useState('')
  const [strankaLoading, setStrankaLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // --- Obrtnik state ---
  const [obrtnikEmail, setObrtnikEmail] = useState('')
  const [obrtnikPassword, setObrtnikPassword] = useState('')
  const [obrtnikError, setObrtnikError] = useState('')
  const [obrtnikLoading, setObrtnikLoading] = useState(false)

  const handleStrankaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStrankaError('')
    setStrankaLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: strankaEmail,
        password: strankaPassword,
      })

      if (signInError || !data.user) {
        setStrankaError('Napačen email ali geslo. Preverite podatke.')
        return
      }

      // Wait for session to be established before checking endpoints
      // This prevents race conditions where cookies aren't set yet
      await new Promise(resolve => setTimeout(resolve, 500))

      // Preveri custom redirect
      const redirectTo = searchParams.get('redirectTo')
      if (redirectTo?.startsWith('/') && !redirectTo.startsWith('/prijava')) {
        router.push(redirectTo)
        return
      }

      // Preveri admin - retry logic in case session isn't ready
      let adminRes = await fetch('/api/admin/me')
      if (!adminRes.ok) {
        // Retry once after a small delay
        await new Promise(resolve => setTimeout(resolve, 300))
        adminRes = await fetch('/api/admin/me')
      }
      
      if (adminRes.ok) {
        router.push('/admin')
        return
      }

      // Preveri profil in preusmeri glede na vlogo
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      const profile = profileData as { role: string | null } | null

      if (!profile) {
        router.push('/registracija')
        return
      }

      router.push(profile.role === 'obrtnik' ? '/partner-dashboard' : '/dashboard')
    } catch {
      setStrankaError('Napaka pri prijavi. Poskusite znova.')
    } finally {
      setStrankaLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = searchParams.get('redirectTo')
      const callbackUrl = `${window.location.origin}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl },
      })
    } catch {
      setStrankaError('Napaka pri prijavi z Google. Poskusite znova.')
      setGoogleLoading(false)
    }
  }

  const handleObrtnikSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setObrtnikError('')
    setObrtnikLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: obrtnikEmail,
        password: obrtnikPassword,
      })

      if (signInError || !data.user) {
        setObrtnikError('Napačen email ali geslo. Preverite podatke.')
        return
      }

      // Wait for session to be established before checking DB
      await new Promise(resolve => setTimeout(resolve, 500))

      // Preveri da ima obrtniški profil
      const { data: obrtnikProfile } = await supabase
        .from('obrtnik_profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!obrtnikProfile) {
        await supabase.auth.signOut()
        setObrtnikError('Ta račun nima obrtniških pravic. Registrirajte se kot obrtnik.')
        return
      }

      router.push('/partner-dashboard')
    } catch {
      setObrtnikError('Napaka pri prijavi. Poskusite znova.')
    } finally {
      setObrtnikLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Dobrodošli nazaj</h2>
        <p className="text-muted-foreground">Prijavite se v svoj račun</p>
      </div>

      <Tabs defaultValue="stranka">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="stranka" className="flex-1 gap-2">
            <Search className="w-4 h-4" />
            Stranka
          </TabsTrigger>
          <TabsTrigger value="obrtnik" className="flex-1 gap-2">
            <Wrench className="w-4 h-4" />
            Obrtnik
          </TabsTrigger>
        </TabsList>

        {/* ── STRANKA TAB ── */}
        <TabsContent value="stranka">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 mb-4"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || strankaLoading}
          >
            <GoogleIcon />
            {googleLoading ? 'Prijavljam z Google...' : 'Prijava z Google'}
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ali</span>
            </div>
          </div>

          <form onSubmit={handleStrankaSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stranka-email">Email</Label>
              <Input
                id="stranka-email"
                type="email"
                placeholder="vam@primer.si"
                value={strankaEmail}
                onChange={(e) => setStrankaEmail(e.target.value)}
                required
                disabled={strankaLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stranka-password">Geslo</Label>
              <Input
                id="stranka-password"
                type="password"
                placeholder="••••••••"
                value={strankaPassword}
                onChange={(e) => setStrankaPassword(e.target.value)}
                required
                disabled={strankaLoading}
              />
            </div>

            {strankaError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {strankaError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={strankaLoading}>
              {strankaLoading ? 'Prijavljam se...' : 'Prijava'}
            </Button>
          </form>

          <div className="mt-4 text-sm text-center space-y-1">
            <div>
              <span className="text-muted-foreground">Nimaš računa? </span>
              <Link href="/registracija" className="text-primary hover:underline font-medium">
                Registriraj se →
              </Link>
            </div>
          </div>
        </TabsContent>

        {/* ── OBRTNIK TAB ── */}
        <TabsContent value="obrtnik">
          <form onSubmit={handleObrtnikSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obrtnik-email">Email</Label>
              <Input
                id="obrtnik-email"
                type="email"
                placeholder="ime@obrtnik.si"
                value={obrtnikEmail}
                onChange={(e) => setObrtnikEmail(e.target.value)}
                required
                disabled={obrtnikLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obrtnik-password">Geslo</Label>
              <Input
                id="obrtnik-password"
                type="password"
                placeholder="••••••••"
                value={obrtnikPassword}
                onChange={(e) => setObrtnikPassword(e.target.value)}
                required
                disabled={obrtnikLoading}
              />
            </div>

            {obrtnikError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {obrtnikError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={obrtnikLoading}>
              {obrtnikLoading ? 'Prijavljam se...' : 'Prijava'}
            </Button>
          </form>

          <div className="mt-4 text-sm text-center space-y-1">
            <div>
              <span className="text-muted-foreground">Še niste registrirani? </span>
              <Link href="/registracija" className="text-primary hover:underline font-medium">
                Registracija za obrtnike →
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>
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
