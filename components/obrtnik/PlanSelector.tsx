'use client'

import { useState } from 'react'
import { Check, X, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { STRIPE_PRODUCTS, type PlanType } from '@/lib/stripe/config'
import { formatPrice } from '@/lib/stripe/helpers'

interface PlanSelectorProps {
  selectedPlan?: PlanType
  onPlanChange?: (plan: PlanType) => void
  showCheckout?: boolean
}

/**
 * Plan Selector Component
 * Displays both START and PRO plans with comparison
 */
export function PlanSelector({
  selectedPlan = 'START',
  onPlanChange,
  showCheckout = true,
}: PlanSelectorProps) {
  const [loading, setLoading] = useState(false)

  async function handleProCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'PRO' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka pri plačilu')
      if (data.url) window.location.href = data.url
    } catch (err: any) {
      alert('Napaka pri plačilu: ' + (err.message || 'Poskusite ponovno'))
    } finally {
      setLoading(false)
    }
  }

  const startPlan = STRIPE_PRODUCTS.START
  const proPlan = STRIPE_PRODUCTS.PRO

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Izberite paket, ki vam ustreza
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Plačaš samo, ko zaslužiš. Brez vezav, brez drobnega tiska.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* START Plan */}
        <div
          onClick={() => onPlanChange?.('START')}
          className={`relative rounded-2xl border-2 p-8 transition-all cursor-pointer ${
            selectedPlan === 'START'
              ? 'border-blue-500 bg-blue-50/30'
              : 'border-border hover:border-foreground/30'
          }`}
        >
          <Badge variant="secondary" className="mb-4">
            Brezplačno
          </Badge>
          <h3 className="text-2xl font-bold text-foreground">{startPlan.name}</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">
            €0
            <span className="text-sm font-normal text-muted-foreground">/mesec</span>
          </p>

          {/* Features */}
          <div className="mt-8 space-y-4 border-t pt-8">
            {startPlan.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {showCheckout && (
            <Button
              asChild
              variant={selectedPlan === 'START' ? 'default' : 'outline'}
              className="mt-8 w-full"
            >
              <Link href="/registracija-mojster?plan=start">
                Začnite brezplačno
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* PRO Plan */}
        <div
          onClick={() => onPlanChange?.('PRO')}
          className={`relative rounded-2xl border-2 p-8 transition-all cursor-pointer ${
            selectedPlan === 'PRO'
              ? 'border-amber-500 bg-amber-50/30 shadow-lg shadow-amber-500/20'
              : 'border-border hover:border-foreground/30'
          }`}
        >
          {selectedPlan === 'PRO' && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="gap-1 bg-amber-500 text-white">
                <Sparkles className="h-3 w-3" />
                Priporočeno
              </Badge>
            </div>
          )}

          <Badge
            variant="secondary"
            className="mb-4 bg-amber-100 text-amber-900 hover:bg-amber-100"
          >
            Prednostno
          </Badge>
          <h3 className="text-2xl font-bold text-foreground">{proPlan.name}</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatPrice(proPlan.price)}
            <span className="text-sm font-normal text-muted-foreground">/mesec</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Zahtevano naročilo na 12 mesecev
          </p>

          {/* Features */}
          <div className="mt-8 space-y-4 border-t pt-8">
            {proPlan.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <span className="text-sm font-medium text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {showCheckout && (
            <Button
              onClick={handleProCheckout}
              disabled={loading}
              className="mt-8 w-full gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {loading ? 'Preusmerjam...' : 'Izberite PRO'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Funkcija</th>
              <th className="px-6 py-3 text-center font-semibold text-foreground">START</th>
              <th className="px-6 py-3 text-center font-semibold text-foreground">PRO</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-6 py-3 text-foreground">Mesečna naročnina</td>
              <td className="px-6 py-3 text-center">€0</td>
              <td className="px-6 py-3 text-center font-semibold">{formatPrice(proPlan.price)}</td>
            </tr>
            <tr className="border-b">
              <td className="px-6 py-3 text-foreground">Provizija na delo</td>
              <td className="px-6 py-3 text-center font-semibold text-amber-600">
                {startPlan.commission}%
              </td>
              <td className="px-6 py-3 text-center font-semibold text-green-600">
                {proPlan.commission}%
              </td>
            </tr>
            <tr className="border-b">
              <td className="px-6 py-3 text-foreground">Dostop do povpraševanj</td>
              <td className="px-6 py-3 text-center">
                <Check className="mx-auto h-5 w-5 text-green-600" />
              </td>
              <td className="px-6 py-3 text-center">
                <Check className="mx-auto h-5 w-5 text-green-600" />
              </td>
            </tr>
            <tr className="border-b">
              <td className="px-6 py-3 text-foreground">CRM orodje</td>
              <td className="px-6 py-3 text-center">
                <X className="mx-auto h-5 w-5 text-muted-foreground/50" />
              </td>
              <td className="px-6 py-3 text-center">
                <Check className="mx-auto h-5 w-5 text-green-600" />
              </td>
            </tr>
            <tr className="border-b">
              <td className="px-6 py-3 text-foreground">Analitika</td>
              <td className="px-6 py-3 text-center">
                <X className="mx-auto h-5 w-5 text-muted-foreground/50" />
              </td>
              <td className="px-6 py-3 text-center">
                <Check className="mx-auto h-5 w-5 text-green-600" />
              </td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-foreground">Podpora</td>
              <td className="px-6 py-3 text-center">Osnovna</td>
              <td className="px-6 py-3 text-center font-semibold">Prioritetna</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Trust strip */}
      <div className="rounded-lg border border-dashed bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        <p>
          ✓ Brez vezav - preklic kadarkoli &nbsp;•&nbsp; ✓ Brez drobnega tiska &nbsp;•&nbsp; ✓ 24/7
          podpora
        </p>
      </div>
    </div>
  )
}
