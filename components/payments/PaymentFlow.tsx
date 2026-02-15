"use client"

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFlowProps {
  jobId: string
  amount: number
  jobTitle: string
  craftworkerName: string
}

export function PaymentFlow({ jobId, amount, jobTitle, craftworkerName }: PaymentFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<{
    platformFee: number
    craftworkerPayout: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReviewConfirm = async () => {
    setError(null)
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, amount }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent')
      }

      setClientSecret(data.clientSecret)
      setPaymentDetails({
        platformFee: data.platformFee,
        craftworkerPayout: data.craftworkerPayout,
      })
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <div className="mb-8 flex items-center justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`h-1 w-16 sm:w-24 ${
                  step > s ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Review */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Pregled naročila</CardTitle>
            <CardDescription>Preverite podrobnosti pred plačilom</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Naslov projekta</p>
              <p className="font-medium">{jobTitle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Izvajalec</p>
              <p className="font-medium">{craftworkerName}</p>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Cena storitve</span>
                <span>{amount.toFixed(2)} €</span>
              </div>
              <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                <span>Provizija platforme (približno 10-15%)</span>
                <span>Vključeno</span>
              </div>
              <div className="mt-4 flex justify-between text-lg font-bold">
                <span>Skupaj za plačilo</span>
                <span>{amount.toFixed(2)} €</span>
              </div>
            </div>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Vaše plačilo bo varno shranjeno. Sredstva bodo izvajalcu sproščena šele po potrditvi zaključka dela.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {error && (
              <Alert variant="destructive" className="w-full">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleReviewConfirm} className="w-full" size="lg">
              Nadaljuj na plačilo
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Payment */}
      {step === 2 && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentStep
            amount={amount}
            platformFee={paymentDetails?.platformFee || 0}
            onSuccess={() => setStep(3)}
            onError={(err) => setError(err)}
          />
        </Elements>
      )}

      {/* Step 3: Processing */}
      {step === 3 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">Procesiranje plačila...</p>
            <p className="mt-2 text-sm text-muted-foreground">Prosimo počakajte</p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <h3 className="mt-6 text-2xl font-bold">Plačilo uspešno!</h3>
            <p className="mt-2 text-center text-muted-foreground">
              Vaše plačilo je varno shranjeno. Sredstva bomo izvajalcu sprostili takoj ko potrdite zaključek dela.
            </p>
            <Button onClick={() => window.location.href = `/jobs/${jobId}`} className="mt-6">
              Nazaj na projekt
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PaymentStep({
  amount,
  platformFee,
  onSuccess,
  onError,
}: {
  amount: number
  platformFee: number
  onSuccess: () => void
  onError: (error: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    onError('')

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        onError(error.message || 'Payment failed')
        setIsProcessing(false)
      } else {
        onSuccess()
        // Wait a bit before showing success
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred')
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Podatki za plačilo</CardTitle>
          <CardDescription>
            Vnesite podatke vaše kartice ali izberite SEPA Direct Debit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>Znesek storitve</span>
              <span>{(amount - platformFee).toFixed(2)} €</span>
            </div>
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>Provizija platforme</span>
              <span>{platformFee.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Skupaj</span>
              <span>{amount.toFixed(2)} €</span>
            </div>
          </div>
          <PaymentElement />
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Vaši podatki so zaščiteni z Stripe® šifriranjem. LiftGO nima dostopa do številke vaše kartice.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesiranje...
              </>
            ) : (
              `Plačaj ${amount.toFixed(2)} €`
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
