'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react'

interface PaymentsSectionProps {
  partnerId: string
}

export function PaymentsSection({ partnerId }: PaymentsSectionProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const response = await fetch('/api/craftsman/earnings')
        if (response.ok) {
          const earnings = await response.json()
          setData(earnings)
        }
      } catch (error) {
        console.error('Error fetching earnings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [partnerId])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Napaka pri nalaganju podatkov o plačilih.</p>
      </Card>
    )
  }

  const getStripeStatus = () => {
    if (!data.stripeAccountId) {
      return { label: 'Ni povezano', icon: AlertCircle, color: 'text-muted-foreground' }
    }
    if (!data.stripeOnboardingComplete) {
      return { label: 'Onboarding v teku', icon: Clock, color: 'text-yellow-600' }
    }
    return { label: 'Aktivno ✓', icon: CheckCircle, color: 'text-green-600' }
  }

  const stripeStatus = getStripeStatus()
  const StatusIcon = stripeStatus.icon

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sl-SI', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Stripe Account Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Stripe račun</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${stripeStatus.color}`} />
            <span className={`font-medium ${stripeStatus.color}`}>
              {stripeStatus.label}
            </span>
          </div>
          <div className="flex gap-2">
            {!data.stripeOnboardingComplete && (
              <Button size="sm">
                Poveži Stripe
              </Button>
            )}
            {data.stripeOnboardingComplete && data.stripeAccountId && (
              <Button size="sm" variant="outline" asChild>
                <a
                  href={`https://dashboard.stripe.com/${data.stripeAccountId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Odpri Stripe Dashboard
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Earnings Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Ta mesec zasluženo</p>
          <p className="text-2xl font-bold mt-2">
            {formatCurrency(data.statistics.thisMonthEarnings)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Skupaj zasluženo</p>
          <p className="text-2xl font-bold mt-2">
            {formatCurrency(data.statistics.totalEarnings)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Plačanih naročil</p>
          <p className="text-2xl font-bold mt-2">
            {data.statistics.paidOrdersCount}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Čakajoča izplačila</p>
          <p className="text-2xl font-bold mt-2">
            {formatCurrency(data.statistics.pendingPayouts)}
          </p>
        </Card>
      </div>

      {/* Recent Payouts Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Zadnja izplačila</h3>
        {data.recentPayouts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Še nimate izplačil.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Datum
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Znesek
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayouts.map((payout: any) => (
                  <tr key={payout.id} className="border-b last:border-0">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(payout.created_at)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {formatCurrency(Number(payout.amount))}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Izplačano
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
