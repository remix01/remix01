'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface OpenDisputeFormProps {
  escrowId: string
  customerName: string
  partnerName: string
  amount: number
  onSuccess?: () => void
}

export function OpenDisputeForm({
  escrowId,
  customerName,
  partnerName,
  amount,
  onSuccess,
}: OpenDisputeFormProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [resolution, setResolution] = useState<'refund' | 'partial_refund' | 'mediation'>('mediation')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleSubmit = () => {
    if (!reason.trim() || reason.trim().length < 20) {
      setError('Razlog mora vsebovati najmanj 20 znakov')
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirmedSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/escrow/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId,
          reason: reason.trim(),
          description: description.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Napaka pri odpiranju spora')
        setLoading(false)
        return
      }

      // Success - redirect with toast
      router.push(`/dashboard/escrow/${escrowId}?dispute_opened=true`)
      onSuccess?.()
    } catch (err) {
      setError('Nepričakovana napaka. Prosim poskusite znova.')
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Odpri spor</CardTitle>
          <CardDescription>
            To bo zamrznilo escrow in obvestilo obe stranki
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <h4 className="font-medium text-amber-900 mb-2">Preden nadaljujete:</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Spor je javno dejanje in bo obvestena druga stranka</li>
              <li>• Naš tim bo pregledal pritožbo v 48 urah</li>
              <li>• Sredstva ostanejo zamrznjena do reševanja</li>
              <li>• Prosim bodite natančni pri opisu problema</li>
            </ul>
          </div>

          {/* Escrow Info */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-3">Podrobnosti escrow</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nasprotna stranka:</span>
                <span className="font-medium">{partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Znesek:</span>
                <span className="font-medium">€{(amount / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Reason Field */}
          <div>
            <Label htmlFor="reason" className="text-base font-medium mb-2 block">
              Razlog za spor (obvezno, min. 20 znakov)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              placeholder="Prosim opišite, zakaj odpirате spor..."
              rows={4}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/1000 znakov
            </p>
          </div>

          {/* Description Field */}
          <div>
            <Label htmlFor="description" className="text-base font-medium mb-2 block">
              Dodatni opis (neobvezno)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vnesite dodatne podrobnosti, dokaze ali kontekst..."
              rows={3}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/2000 znakov
            </p>
          </div>

          {/* Desired Resolution */}
          <div>
            <Label className="text-base font-medium mb-3 block">Želena rešitev</Label>
            <RadioGroup value={resolution} onValueChange={(v: any) => setResolution(v)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="refund" id="refund" />
                  <Label htmlFor="refund" className="font-normal cursor-pointer">
                    Polno vračilo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial_refund" id="partial_refund" />
                  <Label htmlFor="partial_refund" className="font-normal cursor-pointer">
                    Delno vračilo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mediation" id="mediation" />
                  <Label htmlFor="mediation" className="font-normal cursor-pointer">
                    Mediacija
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Prekliči
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={loading || reason.trim().length < 20}
              className="ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Obdelava...
                </>
              ) : (
                'Odpri spor'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ali ste prepričani?</AlertDialogTitle>
            <AlertDialogDescription>
              To bo zamrznilo escrow in obvestilo obe stranki. Spor bo javno dejanje. Naš tim
              bo pregledal vašo pritožbo v 48 urah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-900">
              <strong>Razlog:</strong> {reason}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedSubmit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Obdelava...' : 'Potrdi - Odpri spor'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
