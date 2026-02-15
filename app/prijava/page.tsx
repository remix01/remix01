'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { Star, CheckCircle, Users, Shield, Chrome, Apple, Loader2 } from 'lucide-react'

export default function PrijavaPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/protected')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Napaka pri prijavi')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section with Login Form */}
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left Column - Value Proposition */}
              <div className="flex flex-col justify-center">
                <h1 className="font-display text-[32px] sm:text-4xl lg:text-5xl font-bold leading-tight text-foreground text-balance">
                  Dobrodošli nazaj pri{' '}
                  <span className="text-primary">LiftGO</span>
                </h1>
                <p className="mt-4 text-[16px] sm:text-lg leading-relaxed text-muted-foreground max-w-lg">
                  Prijavite se in nadaljujte z iskanjem zanesljivih obrtnikov ali upravljanjem vaših povpraševanj.
                </p>

                {/* Trust Badges */}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-foreground">4.9</span>
                    <span className="text-sm text-muted-foreground">1.200+ ocen</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>Verificirani mojstri</span>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-display text-2xl font-bold text-primary">225+</p>
                        <p className="text-xs text-muted-foreground">Aktivnih mojstrov</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-display text-2xl font-bold text-primary">5.000+</p>
                        <p className="text-xs text-muted-foreground">Opravljenih del</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Login Form */}
              <div className="flex items-center justify-center lg:justify-end">
                <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Prijavite se v račun
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vnesite svoje podatke za dostop do platforme
                  </p>

                  <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="email">E-poštni naslov</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ime@primer.si"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="min-h-[48px] text-[16px]"
                        required
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="password">Geslo</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="min-h-[48px] text-[16px]"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                        />
                        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                          Zapomni si me
                        </Label>
                      </div>
                      <Link
                        href="/auth/reset-password"
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        Pozabljeno geslo?
                      </Link>
                    </div>

                    {error && (
                      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full gap-2 min-h-[48px]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Prijavljam se...
                        </>
                      ) : (
                        'Prijava'
                      )}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ali</span>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full gap-2 min-h-[48px]"
                        disabled
                      >
                        <Chrome className="h-5 w-5" />
                        Prijava z Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full gap-2 min-h-[48px]"
                        disabled
                      >
                        <Apple className="h-5 w-5" />
                        Prijava z Apple
                      </Button>
                    </div>

                    <p className="text-center text-sm text-muted-foreground">
                      Še nimate računa?{' '}
                      <Link
                        href="/auth/sign-up"
                        className="font-semibold text-primary transition-colors hover:text-primary/80"
                      >
                        Registracija
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
