'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function AdminSetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ime, setIme] = useState('')
  const [priimek, setPriimek] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1)

      if (error && error.code !== 'PGRST116') {
        console.error('[v0] Error checking setup status:', error)
      }

      if (data && data.length > 0) {
        setSetupComplete(true)
      }
    } catch (error) {
      console.error('[v0] Error checking setup status:', error)
    } finally {
      setCheckingSetup(false)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (password !== confirmPassword) {
      setError('Gesli se ne ujemata')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Geslo mora biti dolgo najmanj 8 znakov')
      setIsLoading(false)
      return
    }

    try {
      const { data: existingAdmins } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1)

      if (existingAdmins && existingAdmins.length > 0) {
        setError('Setup je že dokončan. Poskusite se prijaviti.')
        setIsLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Napaka pri ustvarjanju uporabnika')
      }

      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          auth_user_id: authData.user.id,
          email,
          ime,
          priimek,
          vloga: 'SUPER_ADMIN',
          aktiven: true,
          created_by: authData.user.id,
        })

      if (adminError) throw adminError

      setSuccess(true)
      
      await supabase.auth.signInWithPassword({ email, password })
      
      setTimeout(() => {
        router.push('/admin')
      }, 2000)
    } catch (error: unknown) {
      console.error('[v0] Setup error:', error)
      setError(error instanceof Error ? error.message : 'Napaka pri inicializaciji')
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (setupComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Setup že dokončan</CardTitle>
            </div>
            <CardDescription>
              Adminski sistem je že inicializiran
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              V sistem se lahko prijavite na strani za prijavo.
            </p>
            <Button onClick={() => router.push('/auth/login')} className="w-full">
              Pojdi na prijavo
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>Setup uspešen</CardTitle>
            </div>
            <CardDescription>
              Super admin račun je bil ustvarjen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Preusmeritev na admin panel...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Setup</CardTitle>
          <CardDescription>
            Ustvarite prvega super admin uporabnika
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ime">Ime</Label>
                <Input
                  id="ime"
                  type="text"
                  value={ime}
                  onChange={(e) => setIme(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priimek">Priimek</Label>
                <Input
                  id="priimek"
                  type="text"
                  value={priimek}
                  onChange={(e) => setPriimek(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Geslo</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">Najmanj 8 znakov</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potrdite geslo</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ustvarjam...
                </>
              ) : (
                'Ustvari Super Admin'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
