'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Zap } from 'lucide-react'
import { PRODUCTS } from '@/lib/products'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startCheckoutSession } from '@/app/actions/stripe'
import { useCallback } from 'react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type PartnerAccount = {
  id: string
  user_id: string
  company_name: string
  category: string
  subscription_tier: 'START' | 'PRO'
  created_at: string
}

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<PartnerAccount | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/partner-auth/login')
          return
        }

        // Fetch partner account
        const { data: partnerData, error } = await supabase
          .from('partner_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error || !partnerData) {
          console.error('Error fetching partner account:', error)
          router.replace('/partner-auth/login')
          return
        }

        setAccount(partnerData as PartnerAccount)
      } catch (error) {
        console.error('Auth error:', error)
        router.replace('/partner-auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  const startCheckoutSessionForPro = useCallback(
    () => startCheckoutSession('pro-package'),
    []
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (!account) {
    return null
  }

  const currentTier = account.subscription_tier || 'START'
  const startPackage = PRODUCTS.find(p => p.id === 'start-package')!
  const proPackage = PRODUCTS.find(p => p.id === 'pro-package')!

  if (showCheckout) {
    return (
      <div className="flex h-screen">
        <PartnerSidebar partner={{ company_name: account.company_name, category: account.category }} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl p-6 lg:p-8">
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => setShowCheckout(false)}
                className="mb-4"
              >
                ← Nazaj
              </Button>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Nadgradnja na PRO Paket
              </h1>
              <p className="mt-2 text-muted-foreground">
                Zaključite plačilo za aktivacijo PRO paketa
              </p>
            </div>

            <div id="checkout">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret: startCheckoutSessionForPro }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <PartnerSidebar partner={{ company_name: account.company_name, category: account.category }} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground">
              Upravljanje računa
            </h1>
            <p className="mt-2 text-muted-foreground">
              Preglejte svoj naročniški paket in nadgradite na PRO
            </p>
          </div>

          {/* Current Plan Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trenutni paket</CardTitle>
                  <CardDescription>Vaša trenutna naročnina</CardDescription>
                </div>
                <Badge variant={currentTier === 'PRO' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                  {currentTier}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/50 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold">
                      {currentTier === 'PRO' ? proPackage.name : startPackage.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {currentTier === 'PRO' ? proPackage.description : startPackage.description}
                    </p>
                  </div>
                  <p className="font-display text-2xl font-bold text-primary">
                    {currentTier === 'PRO' ? '€49/mesec' : 'Brezplačno'}
                  </p>
                </div>
                <ul className="mt-6 space-y-3">
                  {(currentTier === 'PRO' ? proPackage.features : startPackage.features).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Section */}
          {currentTier === 'START' && (
            <div>
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
                Nadgradite na PRO
              </h2>
              
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle>{proPackage.name}</CardTitle>
                  </div>
                  <CardDescription>{proPackage.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <p className="font-display text-3xl font-bold text-primary">
                      €49 <span className="text-base font-normal text-muted-foreground">/ mesec</span>
                    </p>
                  </div>

                  <ul className="mb-6 space-y-3">
                    {proPackage.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => setShowCheckout(true)}
                  >
                    <Zap className="h-4 w-4" />
                    Nadgradi na PRO
                  </Button>

                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Prekličite kadarkoli. Brez skritih stroškov.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Account Details */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Podatki o računu</CardTitle>
              <CardDescription>Vaši osnovni podatki</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Podjetje</p>
                <p className="text-base font-semibold">{account.company_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kategorija</p>
                <p className="text-base">{account.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Datum registracije</p>
                <p className="text-base">{new Date(account.created_at).toLocaleDateString('sl-SI')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
