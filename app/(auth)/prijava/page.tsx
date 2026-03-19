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

function PrijavaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- Stranka state ---
  const [strankaEmail, setStrankaEmail] = useState('')
  const [strankaPassword, setStrankaPassword] = useState('')
  const [strankaError, setStrankaError] = useState('')
  const [strankaLoading, setStrankaLoading] = useState(false)

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

      // Preveri custom redirect
      const redirectTo = searchParams.get('redirectTo')
      if (redirectTo?.startsWith('/') && !redirectTo.startsWith('/prijava')) {
        router.push(redirectTo)
        return
      }

      // Preveri admin
      const adminRes = await fetch('/api/admin/me')
      if (adminRes.ok) {
        router.push('/admin')
        return
      }

      // Preveri profil in preusmeri glede na vlogo
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

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
