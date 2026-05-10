'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Crown } from 'lucide-react'
import { AIUsageWidget } from '@/components/ai-usage-widget'

type Plan = 'START' | 'PRO'

function normalizePlan(tier: string | null | undefined): Plan {
  if (!tier) return 'START'
  const value = tier.toUpperCase()
  return value === 'PRO' ? 'PRO' : 'START'
}

export default function NarocinaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [processingPortal, setProcessingPortal] = useState(false)

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/partner-auth/login')
        return
      }

      // Get obrtnik subscription data (using admin client would be ideal)
      const { data: obrtnikProfile } = await supabase
        .from('obrtnik_profiles')
        .select('subscription_tier, stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle()

      if (obrtnikProfile) {
        setCurrentPlan(obrtnikProfile.subscription_tier?.toUpperCase() === 'PRO' ? 'PRO' : 'START')
        setStripeCustomerId(obrtnikProfile.stripe_customer_id)
      } else {
        setCurrentPlan('START')
      }

      setLoading(false)
    } catch (error) {
      console.error('[v0] Error loading subscription data:', error)
      setErrorMessage('Napaka pri nalaganju podatkov o naročnini')
      setLoading(false)
    }
  }

  const handleUpgradeClick = async () => {
    setProcessingCheckout(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'PRO',
          email: user.email,
          successPath: '/obrtnik/narocnina?stripe=success',
          cancelPath: '/obrtnik/narocnina?cancelled=true',
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setErrorMessage(data.error || 'Napaka pri ustvarjanju plačila')
      }
    } catch (error) {
      console.error('[v0] Checkout error:', error)
      setErrorMessage('Napaka pri nadgradnji')
    } finally {
      setProcessingCheckout(false)
    }
  }

  const handleManageSubscription = async () => {
    setProcessingPortal(true)
    try {
      if (!stripeCustomerId) {
        setErrorMessage('Stripe ID ni dostopen')
        return
      }

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: '/obrtnik/narocnina' }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setErrorMessage('Napaka pri dostopanju do portala')
      }
    } catch (error) {
      console.error('[v0] Portal error:', error)
      setErrorMessage('Napaka pri upravljanju naročnine')
    } finally {
      setProcessingPortal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500">Nalagam podatke o naročnini...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Naročnina</h1>
        <p className="text-gray-600 mt-2">Upravljanje vašega načrta in računa</p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex gap-2 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="flex gap-2 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Current Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* START Plan Card */}
        <Card
          className={`p-8 border-2 transition ${
            currentPlan === 'START'
              ? 'border-gray-300 bg-white'
              : 'border-gray-200 opacity-75'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold">START</h3>
                <p className="text-gray-600 text-sm">Osnovna naročnina</p>
              </div>
              {currentPlan === 'START' && (
                <div className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                  Trenutni načrt
                </div>
              )}
            </div>

            <div>
              <p className="text-4xl font-bold">0 €</p>
              <p className="text-sm text-gray-600">/mesec</p>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <span className="text-teal-600">✓</span>
                <span>Standardna vidnost</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="text-teal-600">✓</span>
                <span>10% provizija na ponudbe</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="text-teal-600">✓</span>
                <span>Osnovna podpora</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <span>✗</span>
                <span>Prioritetna podpora</span>
              </li>
            </ul>

            {currentPlan === 'START' && (
              <Button disabled className="w-full">
                Trenutni načrt
              </Button>
            )}
          </div>
        </Card>

        {/* PRO Plan Card */}
        <Card
          className={`p-8 border-2 transition ${
            currentPlan === 'PRO'
              ? 'border-teal-600 bg-teal-50'
              : 'border-gray-200'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">PRO</h3>
                  <Crown className="w-6 h-6 text-yellow-500" />
                </div>
                <p className="text-gray-600 text-sm">Napredna naročnina</p>
              </div>
              {currentPlan === 'PRO' && (
                <div className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-full">
                  Trenutni načrt
                </div>
              )}
            </div>

            <div>
              <p className="text-4xl font-bold text-teal-600">29 €</p>
              <p className="text-sm text-gray-600">/mesec</p>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <span className="text-teal-600">✓</span>
                <span className="font-medium">Prioritetna vidnost</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="text-teal-600">✓</span>
                <span className="font-medium">5% provizija na ponudbe</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="text-teal-600">✓</span>
                <span className="font-medium">Prioritetna podpora</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="text-teal-600">✓</span>
                <span className="font-medium">Analitika in statistike</span>
              </li>
            </ul>

            {currentPlan === 'START' && (
              <Button
                onClick={handleUpgradeClick}
                disabled={processingCheckout}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {processingCheckout ? 'Nadgradam...' : 'Nadgradi na PRO'}
              </Button>
            )}

            {currentPlan === 'PRO' && (
              <Button disabled className="w-full">
                Trenutni načrt
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-6">Primerjava načrtov</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2">
                <th className="text-left py-3 font-semibold">Funkcionalnost</th>
                <th className="text-center py-3 font-semibold">START</th>
                <th className="text-center py-3 font-semibold">PRO</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">Mesečna cena</td>
                <td className="text-center">0 €</td>
                <td className="text-center">29 €</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Provizija na ponudbe</td>
                <td className="text-center font-medium">10%</td>
                <td className="text-center font-medium text-teal-600">5%</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Vidnost profilne strani</td>
                <td className="text-center">Standardna</td>
                <td className="text-center font-medium text-teal-600">Prioritetna</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Prikazan v rezultatih iskanja</td>
                <td className="text-center">✓</td>
                <td className="text-center font-medium text-teal-600">✓ (prvo mesto)</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Teksti in opis</td>
                <td className="text-center">Do 500 znakov</td>
                <td className="text-center">Do 1000 znakov</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Slike v portfelju</td>
                <td className="text-center">Do 3</td>
                <td className="text-center">Do 10</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Podpora</td>
                <td className="text-center">Osnovna</td>
                <td className="text-center font-medium text-teal-600">Prioritetna</td>
              </tr>
              <tr>
                <td className="py-3">Analitika</td>
                <td className="text-center">-</td>
                <td className="text-center font-medium text-teal-600">✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Management Section */}
      {currentPlan === 'PRO' && (
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">Upravljanje naročnine</h2>
          <p className="text-gray-600 mb-6">
            Spremenite podatke o plačilu, naslovu ali prekinite naročnino.
          </p>

          <Button
            onClick={handleManageSubscription}
            disabled={processingPortal || !stripeCustomerId}
            variant="outline"
            className="w-full"
          >
            {processingPortal ? 'Nalagam portal...' : 'Upravljaj naročnino'}
          </Button>
        </Card>
      )}

      {/* AI Usage Section */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-4">AI Asistent – Dnevna uporaba</h2>
        <p className="text-gray-600 mb-6">
          Pregled vaše dnevne porabe AI asistenta. PRO načrt vključuje 100 sporočil/dan.
        </p>
        <AIUsageWidget />
      </Card>

      {/* FAQ Section */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-6">Pogosta vprašanja</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Katero kro bi moral izbrati?</h3>
            <p className="text-gray-600">
              Če šele začinjate, je START paket prav primeren. Ko se vaš posao razvije,
              se lahko nadgradite na PRO za boljšo vidnost in manj provizije.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Ali se lahko kadarkoli spremenjem?</h3>
            <p className="text-gray-600">
              Da! Lahko se kadarkoli nadgradite ali znižate na drugi paket. Spremembe
              se uveljavijo naslednji mesec.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Kaj se zgodi, če preklicemalm naročnino?</h3>
            <p className="text-gray-600">
              Ko prekličete naročnino, se vaš profil preslika na START paket. Vaši podatki
              in ponudbe ostanejo, samo se zmanjšajo sposobnosti.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Ali je polnjenje avtomatsko?</h3>
            <p className="text-gray-600">
              Da, naročnina se samodejno obnovluje vsak mesec. Prejmete račun pred
              obnovitvijo.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
