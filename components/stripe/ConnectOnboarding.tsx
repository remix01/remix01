"use client"

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface StripeStatus {
  isComplete: boolean
  hasAccount: boolean
  needsInfo: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  restrictionReason: string | null
}

export function ConnectOnboarding({ userEmail }: { userEmail: string }) {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingAccount, setCreatingAccount] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stripe/connect/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError('Napaka pri preverjanju statusa')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    try {
      setCreatingAccount(true)
      setError(null)

      // Create account
      const createResponse = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      })

      if (!createResponse.ok) {
        throw new Error('Failed to create account')
      }

      const { accountId } = await createResponse.json()

      // Get onboarding link
      const linkResponse = await fetch('/api/stripe/connect/create-onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      })

      if (!linkResponse.ok) {
        throw new Error('Failed to create onboarding link')
      }

      const { url } = await linkResponse.json()

      // Redirect to Stripe
      window.location.href = url

    } catch (err) {
      setError('Napaka pri ustvarjanju računa')
      console.error(err)
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleContinueOnboarding = async () => {
    try {
      setCreatingAccount(true)
      setError(null)

      const linkResponse = await fetch('/api/stripe/connect/create-onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'existing' }) // Will use user's existing account
      })

      if (!linkResponse.ok) {
        throw new Error('Failed to create onboarding link')
      }

      const { url } = await linkResponse.json()
      window.location.href = url

    } catch (err) {
      setError('Napaka pri nadaljevanju registracije')
      console.error(err)
    } finally {
      setCreatingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Preverjam status...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!status) return null

  // State: No account yet
  if (!status.hasAccount) {
    return (
      <Alert className="border-primary/50 bg-primary/5">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="flex flex-col gap-4">
          <div>
            <p className="font-semibold text-foreground">Povežite bančni račun za prejemanje plačil</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Za začetek dela na platformi LiftGO potrebujete povezan Stripe račun.
            </p>
          </div>
          <Button 
            onClick={handleCreateAccount}
            disabled={creatingAccount}
            className="w-fit"
          >
            {creatingAccount ? 'Ustvarjam...' : 'Poveži račun prek Stripe'}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // State: In progress (details not submitted)
  if (!status.detailsSubmitted) {
    const progress = status.detailsSubmitted ? 100 : 33

    return (
      <Alert className="border-amber-500/50 bg-amber-500/5">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex flex-col gap-4">
          <div>
            <p className="font-semibold text-foreground">Dokončajte registracijo na Stripe</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Za prejemanje plačil morate dokončati registracijo z vašimi podatki in bančnim računom.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Osebni podatki</span>
              <span>Bančni račun</span>
              <span>Potrditev</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Button 
            onClick={handleContinueOnboarding}
            disabled={creatingAccount}
            className="w-fit"
            variant="default"
          >
            {creatingAccount ? 'Nalagam...' : 'Nadaljuj registracijo'}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // State: Verification in progress (charges not enabled yet)
  if (!status.chargesEnabled || !status.payoutsEnabled) {
    return (
      <Alert className="border-blue-500/50 bg-blue-500/5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded-full bg-blue-500" />
          <Clock className="h-4 w-4 text-blue-600" />
        </div>
        <AlertDescription>
          <p className="font-semibold text-foreground">Stripe preverja vaše podatke</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifikacija običajno traja 1–2 delovna dneva. O rezultatu vas bomo obvestili po e-pošti.
          </p>
          {status.restrictionReason && (
            <p className="mt-2 text-sm text-destructive">
              Razlog: {status.restrictionReason}
            </p>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // State: Fully active
  if (status.isComplete) {
    return (
      <Alert className="border-green-500/50 bg-green-500/5">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">✅ Plačila aktivna · Stripe Connected</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vaš račun je potrjen in lahko začnete prejemati plačila.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            asChild
          >
            <a 
              href="https://connect.stripe.com/express_login" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Stripe Dashboard
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
