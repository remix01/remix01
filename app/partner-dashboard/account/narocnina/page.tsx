'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Zap, AlertCircle } from 'lucide-react'

type PartnerProfile = {
  id: string
  business_name: string
  subscription_tier: 'start' | 'pro' | 'elite' | null
  avg_rating: number
  is_verified: boolean
}

const PLANS = {
  start: {
    name: 'START',
    price: 'Brezplačno',
    per: '',
    benefits: [
      'Neomejene ponudbe',
      '10% provizija',
      'Osnovna vidnost',
      'Dostop do povpraševanj',
      'Osnovne statistike',
      'AI asistent – 5 sporočil/dan',
      'AI: Opis dela, Primerjava, Urnik',
    ],
  },
  pro: {
    name: 'PRO',
    price: '29€',
    per: '/mes',
    benefits: [
      'Neomejene ponudbe',
      '5% provizija',
      'Prioritetna vidnost',
      'Dostop do povpraševanj',
      'Napredne statistike',
      'AI asistent – 100 sporočil/dan',
      'AI: Generator ponudb',
      'AI: Materiali in zaloge',
      'AI: Video diagnoza',
      'AI: Povzetek dela',
      'CRM nadzorna plošča',
    ],
  },
  elite: {
    name: 'ELITE',
    price: '79€',
    per: '/mes',
    benefits: [
      'Vse iz PRO paketa',
      '0% provizija',
      'Top pozicija v rezultatih',
      'Ekskluzivni lead-i',
      'Neomejena AI sporočila',
      'Prednostna podpora',
    ],
  },
}

export default function NarocninaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const loadPartner = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/prijava')
          return
        }

        const { data: partnerData, error } = await supabase
          .from('obrtnik_profiles')
          .select('id, business_name, subscription_tier, avg_rating, is_verified')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error

        if (partnerData) {
          setPartner(partnerData)
        }
      } catch (err: any) {
        console.error('Error loading partner:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPartner()
  }, [router, supabase])

  const handleCheckoutForPlan = async (plan: 'PRO' | 'ELITE') => {
    setProcessing(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/prijava')
        return
      }

      // Call API to create checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          email: user.email,
          successPath: '/partner-dashboard/account/narocnina?stripe=success',
          cancelPath: '/partner-dashboard/account/narocnina?cancelled=true',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err: any) {
      console.error('Error initiating upgrade:', err)
      alert('Napaka pri ustvarjanju seje za plačilo. Poskusite znova.')
    } finally {
      setProcessing(false)
    }
  }

  const handleManageSubscription = async () => {
    setProcessing(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/prijava')
        return
      }

      // Call API to create portal session
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnPath: '/partner-dashboard/account/narocnina',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err: any) {
      console.error('Error opening portal:', err)
      alert('Napaka pri odpiranju upravljanja naročnine. Poskusite znova.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (!partner) {
    return null
  }

  const currentTier = partner.subscription_tier || 'start'
  const startPlan = PLANS.start
  const proPlan = PLANS.pro
  const elitePlan = PLANS.elite

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Naročnina</h1>
            <p className="text-muted-foreground mt-2">Upravljajte svoj paket in naročnino</p>
          </div>

          {/* Current Plan Info */}
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Vaš trenutni paket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="mb-3" variant={currentTier !== 'start' ? 'default' : 'secondary'}>
                    {currentTier === 'elite' ? 'ELITE' : currentTier === 'pro' ? 'PRO' : 'START'}
                  </Badge>
                  <p className="text-muted-foreground">
                    {currentTier === 'elite'
                      ? 'Uživate prednosti ELITE paketa'
                      : currentTier === 'pro'
                        ? 'Uživate prednosti PRO paketa'
                        : 'Trenutno ste na brezplačnem START paketu'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plans Comparison */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Primerjava paketov</h2>
            
            <div className="grid gap-6 md:grid-cols-3">
              {/* START Plan */}
              <Card className={currentTier === 'start' ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <CardTitle>{startPlan.name}</CardTitle>
                  <div className="mt-2">
                    <p className="text-3xl font-bold">{startPlan.price}</p>
                    {startPlan.per && <p className="text-sm text-muted-foreground">{startPlan.per}</p>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {startPlan.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  {currentTier === 'start' && (
                    <Badge variant="outline" className="w-full justify-center py-2">
                      Vaš paket
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* PRO Plan */}
              <Card className={currentTier === 'pro' ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        {proPlan.name}
                      </CardTitle>
                    </div>
                    <Badge>Priporočeno</Badge>
                  </div>
                  <div className="mt-2">
                    <p className="text-3xl font-bold text-primary">{proPlan.price}</p>
                    {proPlan.per && <p className="text-sm text-muted-foreground">{proPlan.per}</p>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {proPlan.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  {currentTier === 'pro' ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={processing}
                    >
                      {processing ? 'Nalagam...' : 'Upravljaj naročnino'}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full gap-2"
                      onClick={() => handleCheckoutForPlan('PRO')}
                      disabled={processing}
                    >
                      <Zap className="h-4 w-4" />
                      {processing ? 'Nalagam...' : 'Nadgradi na PRO'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* ELITE Plan */}
              <Card className={currentTier === 'elite' ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        {elitePlan.name}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">Premium</Badge>
                  </div>
                  <div className="mt-2">
                    <p className="text-3xl font-bold text-primary">{elitePlan.price}</p>
                    {elitePlan.per && <p className="text-sm text-muted-foreground">{elitePlan.per}</p>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {elitePlan.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  {currentTier === 'elite' ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={processing}
                    >
                      {processing ? 'Nalagam...' : 'Upravljaj naročnino'}
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleCheckoutForPlan('ELITE')}
                      disabled={processing}
                    >
                      <Zap className="h-4 w-4" />
                      {processing ? 'Nalagam...' : 'Nadgradi na ELITE'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Plan Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Primerjava lastnosti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-3 font-semibold">Lastnost</th>
                      <th className="text-center py-3 px-3 font-semibold">START</th>
                      <th className="text-center py-3 px-3 font-semibold">PRO</th>
                      <th className="text-center py-3 px-3 font-semibold">ELITE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-3">Mesečnina</td>
                      <td className="text-center py-3 px-3">Brezplačno</td>
                      <td className="text-center py-3 px-3">29€/mes</td>
                      <td className="text-center py-3 px-3">79€/mes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-3">Provizija</td>
                      <td className="text-center py-3 px-3">10%</td>
                      <td className="text-center py-3 px-3">5%</td>
                      <td className="text-center py-3 px-3">0%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-3">Ponudbe</td>
                      <td className="text-center py-3 px-3">Neomejene</td>
                      <td className="text-center py-3 px-3">Neomejene</td>
                      <td className="text-center py-3 px-3">Neomejene</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3">Vidnost</td>
                      <td className="text-center py-3 px-3">Osnovna</td>
                      <td className="text-center py-3 px-3">Prioritetna</td>
                      <td className="text-center py-3 px-3">Top pozicija</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-3">AI sporočila/dan</td>
                      <td className="text-center py-3 px-3">5</td>
                      <td className="text-center py-3 px-3">100</td>
                      <td className="text-center py-3 px-3">Neomejeno</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-3">AI Generator ponudb</td>
                      <td className="text-center py-3 px-3 text-gray-300">✗</td>
                      <td className="text-center py-3 px-3">✓</td>
                      <td className="text-center py-3 px-3">✓</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-3">AI Materiali in zaloge</td>
                      <td className="text-center py-3 px-3 text-gray-300">✗</td>
                      <td className="text-center py-3 px-3">✓</td>
                      <td className="text-center py-3 px-3">✓</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-3">AI Video diagnoza</td>
                      <td className="text-center py-3 px-3 text-gray-300">✗</td>
                      <td className="text-center py-3 px-3">✓</td>
                      <td className="text-center py-3 px-3">✓</td>
                    </tr>
                    <tr>
                      <td className="text-left py-3 px-3">AI Povzetek dela</td>
                      <td className="text-center py-3 px-3 text-gray-300">✗</td>
                      <td className="text-center py-3 px-3">✓</td>
                      <td className="text-center py-3 px-3">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="mt-8 flex gap-3 rounded-lg bg-blue-50 p-4 text-blue-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Preprosto upravljanje</p>
              <p className="mt-1">Prekličite naročnino kadarkoli brez dodatnih stroškov. Razlika v proviziji se izračuna avtomatično.</p>
            </div>
          </div>
    </div>
  )
}
