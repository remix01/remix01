'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type CustomerTier = 'start' | 'pro' | 'elite'

type CustomerProfile = {
  id: string
  full_name: string | null
  role: string | null
  subscription_tier: CustomerTier | null
}

const PLANS: Record<CustomerTier, { name: string; price: string; subtitle: string; features: string[] }> = {
  start: {
    name: 'START',
    price: '0 € / mesec',
    subtitle: 'Za osnovno uporabo',
    features: [
      '5 AI sporočil na dan',
      'Oddaja in spremljanje povpraševanj',
      'Sporočila z mojstri',
    ],
  },
  pro: {
    name: 'PRO',
    price: '29 € / mesec',
    subtitle: 'Za zahtevnejše projekte',
    features: [
      '100 AI sporočil na dan',
      'Hitrejše AI funkcije in predlogi',
      'Napredna pomoč pri pripravi povpraševanj',
      'Prednostna podpora',
    ],
  },
  elite: {
    name: 'ELITE',
    price: '79 € / mesec',
    subtitle: 'Enterprise paket',
    features: ['Neomejeno AI sporočil', 'Prednostna obravnava', 'Premium podpora'],
  },
}

export default function NarocninaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/prijava')
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role, subscription_tier')
          .eq('id', user.id)
          .maybeSingle()

        const loadedProfile = data as CustomerProfile | null
        if (!loadedProfile || loadedProfile.role !== 'narocnik') {
          router.replace('/dashboard')
          return
        }

        setProfile(loadedProfile)
      } catch (err: any) {
        setError(err?.message || 'Napaka pri nalaganju naročnine.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])

  const handleCheckout = async () => {
    setProcessing(true)
    setError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/prijava')
        return
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'PRO',
          email: user.email,
          successPath: '/narocnina?stripe=success',
          cancelPath: '/narocnina?cancelled=true',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Ne morem ustvariti Stripe seje.')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err?.message || 'Napaka pri ustvarjanju Stripe seje.')
    } finally {
      setProcessing(false)
    }
  }

  const handleManageSubscription = async () => {
    setProcessing(true)
    setError(null)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnPath: '/narocnina',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Ne morem odpreti Stripe portala.')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err?.message || 'Napaka pri odpiranju Stripe portala.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) return null

  const currentTier: CustomerTier = profile.subscription_tier || 'start'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Naročnina</h1>
        <p className="mt-1 text-muted-foreground">Izberite paket za vaš naročniški dashboard.</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <span className="text-sm text-muted-foreground">Trenutni paket:</span>
          <Badge>{currentTier === 'elite' ? 'ELITE' : currentTier.toUpperCase()}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(['start', 'pro'] as const).map((tier) => {
          const plan = PLANS[tier]
          const isCurrent = currentTier === tier

          return (
            <Card key={tier} className={isCurrent ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  {isCurrent && <Badge>Aktivno</Badge>}
                </CardTitle>
                <p className="text-2xl font-bold">{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier === 'start' ? (
                  <Button
                    variant="outline"
                    disabled={isCurrent || processing}
                    onClick={handleManageSubscription}
                    className="w-full"
                  >
                    {isCurrent ? 'Trenutni paket' : 'Preklopi preko Stripe portala'}
                  </Button>
                ) : (
                  <Button
                    disabled={isCurrent || processing}
                    onClick={currentTier === 'start' ? handleCheckout : handleManageSubscription}
                    className="w-full"
                  >
                    {isCurrent ? 'Trenutni paket' : currentTier === 'start' ? 'Nadgradi na PRO' : 'Upravljaj paket'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
