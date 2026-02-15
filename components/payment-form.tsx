'use client'

import { useState } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

interface PaymentFormProps {
  amount: number
  craftsmanId: string
  offerId: string
  onSuccess?: () => void
}

export function PaymentForm({ amount, craftsmanId, offerId, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create PaymentIntent on server
      const response = await fetch('/api/stripe/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          craftsmanId,
          offerId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      const { clientSecret, paymentIntentId } = data

      // Confirm payment with card
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      )

      if (confirmError) {
        throw new Error(confirmError.message)
      }

      if (paymentIntent.status === 'succeeded') {
        // Update offer status in database
        const updateResponse = await fetch('/api/stripe/payment/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerId,
            paymentIntentId: paymentIntent.id,
          }),
        })

        if (!updateResponse.ok) {
          console.error('[v0] Failed to update offer status')
        }

        setSuccess(true)
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err: any) {
      console.error('[v0] Payment error:', err)
      setError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">
                Plačilo uspešno!
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Vaše plačilo je bilo uspešno obdelano.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plačilo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Kartica
            </label>
            <div className="rounded-md border border-input bg-background px-3 py-2">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: 'hsl(var(--foreground))',
                      '::placeholder': {
                        color: 'hsl(var(--muted-foreground))',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Skupaj:</span>
            <span className="text-2xl font-bold text-foreground">
              €{(amount / 100).toFixed(2)}
            </span>
          </div>

          <Button
            type="submit"
            className="w-full min-h-[48px]"
            disabled={!stripe || loading}
          >
            {loading ? 'Obdelava...' : `Plačaj €${(amount / 100).toFixed(2)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
