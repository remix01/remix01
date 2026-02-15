"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function StripeReturnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'success' | 'refresh' | 'error'>('checking')
  const [stripeStatus, setStripeStatus] = useState<any>(null)

  const isSuccess = searchParams.get('success') === 'true'
  const isRefresh = searchParams.get('refresh') === 'true'

  useEffect(() => {
    checkStripeStatus()
  }, [])

  const checkStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      
      const data = await response.json()
      setStripeStatus(data)

      if (isSuccess) {
        if (data.isComplete) {
          setStatus('success')
        } else if (data.needsInfo) {
          setStatus('refresh')
        } else {
          setStatus('checking')
        }
      } else if (isRefresh) {
        setStatus('refresh')
      }
    } catch (error) {
      console.error('Error checking status:', error)
      setStatus('error')
    }
  }

  const handleContinueOnboarding = async () => {
    try {
      const response = await fetch('/api/stripe/connect/create-onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'existing' })
      })

      if (!response.ok) throw new Error('Failed to create link')
      
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error creating onboarding link:', error)
      setStatus('error')
    }
  }

  const handleGoToDashboard = () => {
    router.push('/partner-dashboard')
  }

  if (status === 'checking') {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <CardTitle>Preverjam status...</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Počakajte trenutek, medtem ko preverimo vaš Stripe račun.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Card className="border-green-500/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/10 p-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-green-600">Stripe račun uspešno povezan!</CardTitle>
                <CardDescription>Vaš račun je potrjen in lahko začnete prejemati plačila</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-semibold mb-2">Kaj sledi?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Vaš Stripe račun je aktiven</li>
                <li>✓ Lahko začnete prejemati ponudbe za delo</li>
                <li>✓ Plačila bodo samodejno nakazana na vaš bančni račun</li>
              </ul>
            </div>

            <Button onClick={handleGoToDashboard} className="w-full">
              Nazaj na nadzorno ploščo
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'refresh') {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Card className="border-amber-500/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/10 p-2">
                <RefreshCw className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-amber-600">Dokončajte registracijo</CardTitle>
                <CardDescription>Potrebujemo še nekaj dodatnih podatkov</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vaša seja je potekla ali pa Stripe potrebuje dodatne informacije za dokončanje verifikacije.
            </p>

            <div className="flex gap-3">
              <Button onClick={handleContinueOnboarding} className="flex-1">
                Nadaljuj registracijo
              </Button>
              <Button onClick={handleGoToDashboard} variant="outline">
                Pozneje
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">Prišlo je do napake</CardTitle>
                <CardDescription>Nekaj je šlo narobe pri preverjanju statusa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Prosimo poskusite znova ali kontaktirajte podporo.
            </p>

            <div className="flex gap-3">
              <Button onClick={checkStripeStatus} variant="outline" className="flex-1">
                Poskusi znova
              </Button>
              <Button onClick={handleGoToDashboard} variant="secondary">
                Nazaj
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function StripeReturnPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto max-w-2xl py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      </div>
    }>
      <StripeReturnContent />
    </Suspense>
  )
}
