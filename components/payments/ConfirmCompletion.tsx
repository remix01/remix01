"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertTriangle, Loader2, PartyPopper } from 'lucide-react'
import confetti from 'canvas-confetti'

interface ConfirmCompletionProps {
  jobId: string
  jobTitle: string
  craftworkerName: string
  amount: number
}

export function ConfirmCompletion({ jobId, jobTitle, craftworkerName, amount }: ConfirmCompletionProps) {
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDisputing, setIsDisputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/confirm-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm completion')
      }

      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })

      setSuccess(true)

      // Reload page after 3 seconds
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleDispute = async () => {
    if (disputeReason.trim().length < 10) {
      setError('Razlog spora mora vsebovati vsaj 10 znakov')
      return
    }

    setIsDisputing(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, reason: disputeReason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open dispute')
      }

      setShowDisputeDialog(false)
      
      // Show success message and reload
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsDisputing(false)
    }
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-green-100 p-4">
            <PartyPopper className="h-16 w-16 text-green-600" />
          </div>
          <h3 className="mt-6 text-2xl font-bold text-green-900">Plačilo sproščeno!</h3>
          <p className="mt-2 text-center text-green-700">
            Sredstva v višini {amount.toFixed(2)} € so bila uspešno sproščena izvajalcu {craftworkerName}.
          </p>
          <p className="mt-1 text-sm text-green-600">
            Hvala, da uporabljate LiftGO!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Potrditev zaključka projekta</CardTitle>
          <CardDescription>
            Izvajalec {craftworkerName} trdi, da je delo na projektu "{jobTitle}" uspešno zaključeno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Plačilo v višini {amount.toFixed(2)} € je trenutno varno shranjeno.</strong>
              <br />
              Po vaši potrditvi bomo sredstva sprostili izvajalcu. Če niste zadovoljni z opravljenim delom, odprite spor.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-medium">Pred potrditvijo preverite:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ Ali je delo opravljeno v celoti</li>
              <li>✓ Ali je kakovost dela zadovoljiva</li>
              <li>✓ Ali so bile vse dogovorjene storitve izvedene</li>
              <li>✓ Ali ste prejeli vsa potrebna dokumentacija (računi, garancije)</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Potrjujem...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Potrjujem, delo je opravljeno
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowDisputeDialog(true)}
            disabled={isConfirming}
            variant="outline"
            className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
            size="lg"
          >
            <AlertTriangle className="mr-2 h-5 w-5" />
            Odpri spor
          </Button>
        </CardFooter>
      </Card>

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odpiranje spora</DialogTitle>
            <DialogDescription>
              Opišite, zakaj niste zadovoljni z opravljenim delom. Naša ekipa bo preučila vašo prijavo v 24-48 urah.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dispute-reason">Razlog za spor *</Label>
              <Textarea
                id="dispute-reason"
                placeholder="Npr. Delo ni bilo opravljeno v celoti, kakovost ni zadovoljiva, manjkajoče storitve..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 znakov. Bodite čim bolj konkretni.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Plačilo bo zamrznjeno do razrešitve spora. Kontaktirali vas bomo po e-pošti za dodatne podrobnosti.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisputeDialog(false)}
              disabled={isDisputing}
            >
              Prekliči
            </Button>
            <Button
              onClick={handleDispute}
              disabled={isDisputing || disputeReason.trim().length < 10}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isDisputing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pošiljanje...
                </>
              ) : (
                'Odpri spor'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
