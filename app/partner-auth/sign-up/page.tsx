'use client'

import React from "react"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Gesli se ne ujemata')
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/partner-dashboard`,
          data: {
            company_name: companyName,
            user_type: 'partner',
          },
        },
      })
      
      if (error) {
        // Specifični error handling
        if (error.message.includes('already registered')) {
          throw new Error('Ta e-poštni naslov je že registriran')
        } else if (error.message.includes('Password should be')) {
          throw new Error('Geslo mora vsebovati vsaj 6 znakov')
        } else if (error.message.includes('valid email')) {
          throw new Error('Neveljaven e-poštni naslov')
        } else {
          throw error
        }
      }
      
      // Uspešna registracija
      if (data.user) {
        router.push('/partner-auth/sign-up-success')
      }
    } catch (error: unknown) {
      console.error('[v0] Signup error:', error)
      setError(error instanceof Error ? error.message : 'Napaka pri registraciji. Poskusite znova.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Registracija obrtnika</CardTitle>
              <CardDescription>Postanite LiftGO partner</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="company">Ime podjetja/obrta</Label>
                    <Input
                      id="company"
                      type="text"
                      placeholder="Mojster d.o.o."
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ime@obrtnik.si"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Geslo</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Ponovite geslo</Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Registriram se...' : 'Postanite partner'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Že imate račun?{' '}
                  <Link
                    href="/partner-auth/login"
                    className="underline underline-offset-4"
                  >
                    Prijava
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
