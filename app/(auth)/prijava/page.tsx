'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Wrench } from 'lucide-react'

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

  const routeAuthenticatedUser = async (userId: string) => {
    const supabase = createClient()

    const redirectTarget = searchParams.get('redirect') ?? searchParams.get('redirectTo')
    if (redirectTarget?.startsWith('/') && !redirectTarget.startsWith('/prijava')) {
      router.push(redirectTarget)
      return
    }

    // Check admin status directly via client session (avoids cookie-timing issues with fetch)
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminUser) {
      router.push('/admin')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.role === 'obrtnik') {
      router.push('/partner-dashboard')
      return
    }

    router.push('/dashboard')
  }

  const handleGoogleLogin = async () => {
    setStrankaError('')
    setGoogleLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/prijava?oauth=google`,
        },
      })

      if (error) {
        setStrankaError('Google prijava trenutno ni na voljo. Poskusite znova.')
        setGoogleLoading(false)
      }
    } catch {
      setStrankaError('Napaka pri Google prijavi. Poskusite znova.')
      setGoogleLoading(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('oauth') !== 'google') return

    let active = true

    const handleGoogleCallback = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user?.id) {
          return
        }

        if (!active) return
        setStrankaLoading(true)

        let intendedRole: 'narocnik' | 'obrtnik' = 'narocnik'
        try {
          const stored = sessionStorage.getItem('oauth_intended_role')
          if (stored === 'obrtnik') intendedRole = 'obrtnik'
          sessionStorage.removeItem('oauth_intended_role')
        } catch {}

        // Create the profiles row if this is a first Google OAuth sign-in.
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: session.user.id,
            role: intendedRole,
            email: session.user.email ?? null,
            full_name:
              session.user.user_metadata?.full_name ??
              session.user.user_metadata?.name ??
              null,
          })

          if (intendedRole === 'obrtnik') {
            await supabase.from('obrtnik_profiles').insert({
              id: session.user.id,
              business_name:
                session.user.user_metadata?.full_name ??
                session.user.user_metadata?.name ??
                session.user.email ??
                'Novi partner',
            })
          }
        }

        await routeAuthenticatedUser(session.user.id)
      } catch {
        if (!active) return
        setStrankaError('Google prijava ni uspela. Poskusite znova.')
      } finally {
        if (active) {
          setStrankaLoading(false)
          setGoogleLoading(false)
        }
      }
    }

    void handleGoogleCallback()

    return () => {
      active = false
    }
  }, [searchParams])

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

      if (
        signInError?.code === 'email_not_confirmed' ||
        signInError?.code === 'email_not_verified' ||
        signInError?.message?.toLowerCase().includes('email not confirmed')
      ) {
        setStrankaError(
          'Vaš email še ni potrjen. Preverite svoj nabiralnik in kliknite na potrditveno povezavo. Če je ne najdete, preverite mapo z vsiljeno pošto.'
        )
        return
      }

      if (signInError || !data.user) {
        setStrankaError('Napačen email ali geslo. Preverite podatke.')
        return
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      await routeAuthenticatedUser(data.user.id)
    } catch {
      setStrankaError('Napaka pri prijavi. Poskusite znova.')
    } finally {
      setStrankaLoading(false)
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

      if (
        signInError?.code === 'email_not_confirmed' ||
        signInError?.code === 'email_not_verified' ||
        signInError?.message?.toLowerCase().includes('email not confirmed')
      ) {
        setObrtnikError(
          'Vaš email še ni potrjen. Preverite svoj nabiralnik in kliknite na potrditveno povezavo. Če je ne najdete, preverite mapo z vsiljeno pošto.'
        )
        return
      }

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

      {searchParams.get('error') === 'not_obrtnik' && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md">
          Ta račun nima obrtniških pravic. Če ste se pravkar registrirali, poskusite čez nekaj trenutkov. Če težava
          ne izgine, nas kontaktirajte.
        </div>
      )}

      {searchParams.get('reset') === 'success' && (
        <div className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 p-4 rounded-md">
          Povezava za ponastavitev gesla je bila poslana. Preverite svoj email.
        </div>
      )}

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

        <TabsContent value="stranka">
          <form onSubmit={handleStrankaSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stranka-email">Email</Label>
              <Input id="stranka-email" type="email" placeholder="vam@primer.si" value={strankaEmail} onChange={(e) => setStrankaEmail(e.target.value)} required disabled={strankaLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stranka-password">Geslo</Label>
              <Input id="stranka-password" type="password" placeholder="••••••••" value={strankaPassword} onChange={(e) => setStrankaPassword(e.target.value)} required disabled={strankaLoading} />
            </div>

            {strankaError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{strankaError}</div>}

            <Button type="submit" className="w-full" disabled={strankaLoading}>{strankaLoading ? 'Prijavljam se...' : 'Prijava'}</Button>
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={strankaLoading || googleLoading}>{googleLoading ? 'Preusmerjam na Google...' : 'Nadaljuj z Google računom'}</Button>

            <div className="border-t pt-3 text-center">
              <Link href="/pozabljeno-geslo" className="text-sm text-muted-foreground hover:underline">
                Pozabljeno geslo?
              </Link>
            </div>
          </form>

          <div className="mt-4 text-sm text-center space-y-1">
            <div>
              <span className="text-muted-foreground">Nimaš računa? </span>
              <Link href="/registracija" className="text-primary hover:underline font-medium">Registriraj se →</Link>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="obrtnik">
          <form onSubmit={handleObrtnikSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obrtnik-email">Email</Label>
              <Input id="obrtnik-email" type="email" placeholder="ime@obrtnik.si" value={obrtnikEmail} onChange={(e) => setObrtnikEmail(e.target.value)} required disabled={obrtnikLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obrtnik-password">Geslo</Label>
              <Input id="obrtnik-password" type="password" placeholder="••••••••" value={obrtnikPassword} onChange={(e) => setObrtnikPassword(e.target.value)} required disabled={obrtnikLoading} />
            </div>

            {obrtnikError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{obrtnikError}</div>}

            <Button type="submit" className="w-full" disabled={obrtnikLoading}>{obrtnikLoading ? 'Prijavljam se...' : 'Prijava'}</Button>

            <div className="border-t pt-3 text-center">
              <Link href="/pozabljeno-geslo" className="text-sm text-muted-foreground hover:underline">
                Pozabljeno geslo?
              </Link>
            </div>
          </form>

          <div className="mt-4 text-sm text-center space-y-1">
            <div>
              <span className="text-muted-foreground">Še niste registrirani? </span>
              <Link href="/registracija" className="text-primary hover:underline font-medium">Registracija za obrtnike →</Link>
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
