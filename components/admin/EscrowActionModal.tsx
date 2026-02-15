'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { X } from 'lucide-react'

interface EscrowActionModalProps {
  dispute: {
    id: string
    jobId: string
    jobTitle: string
    customer: { name: string; email: string }
    craftworker: { name: string; email: string }
    amount: number
    platformFee: number
  }
  onClose: () => void
  onResolved: () => void
}

export function EscrowActionModal({ dispute, onClose, onResolved }: EscrowActionModalProps) {
  const [resolution, setResolution] = useState<'release_to_craftworker' | 'refund_to_customer' | 'split'>('split')
  const [splitPct, setSplitPct] = useState([50])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const netAmount = dispute.amount - dispute.platformFee

  const customerAmount = resolution === 'refund_to_customer' 
    ? dispute.amount 
    : resolution === 'split'
    ? (netAmount * splitPct[0]) / 100
    : 0

  const craftworkerAmount = resolution === 'release_to_craftworker'
    ? netAmount
    : resolution === 'split'
    ? (netAmount * (100 - splitPct[0])) / 100
    : 0

  const handleResolve = async () => {
    if (!reason.trim()) {
      alert('Prosim vnesite obrazložitev odločitve')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/disputes/${dispute.jobId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution,
          splitPct: resolution === 'split' ? splitPct[0] : undefined,
          reason
        })
      })

      if (response.ok) {
        onResolved()
        onClose()
      } else {
        const error = await response.json()
        alert(`Napaka: ${error.error}`)
      }
    } catch (error) {
      console.error('[v0] Failed to resolve dispute:', error)
      alert('Napaka pri reševanju spora')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Reševanje spora</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Job Info */}
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">{dispute.jobTitle}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Stranka:</span>
                <span className="ml-2 font-medium">{dispute.customer.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Obrtnik:</span>
                <span className="ml-2 font-medium">{dispute.craftworker.name}</span>
              </div>
            </div>
          </div>

          {/* Resolution Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Tip odločitve</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={resolution === 'refund_to_customer' ? 'default' : 'outline'}
                onClick={() => setResolution('refund_to_customer')}
                className="w-full"
              >
                Vrni stranki
              </Button>
              <Button
                variant={resolution === 'split' ? 'default' : 'outline'}
                onClick={() => setResolution('split')}
                className="w-full"
              >
                Razdeli
              </Button>
              <Button
                variant={resolution === 'release_to_craftworker' ? 'default' : 'outline'}
                onClick={() => setResolution('release_to_craftworker')}
                className="w-full"
              >
                Sprosti obrtniku
              </Button>
            </div>
          </div>

          {/* Split Slider */}
          {resolution === 'split' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Razdelitev: {splitPct[0]}% stranki / {100 - splitPct[0]}% obrtniku
              </label>
              <Slider
                value={splitPct}
                onValueChange={setSplitPct}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
          )}

          {/* Amount Preview */}
          <div className="rounded-lg border p-4">
            <h4 className="font-medium mb-3">Pregled končnih zneskov</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skupaj v escrow:</span>
                <span className="font-medium">€{dispute.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platforma provizija:</span>
                <span className="font-medium">€{dispute.platformFee.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stranka ({dispute.customer.name}):</span>
                <span className="font-bold text-lg">€{customerAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Obrtnik ({dispute.craftworker.name}):</span>
                <span className="font-bold text-lg">€{craftworkerAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">Obrazložitev odločitve</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vnesite razlog za to odločitev. Ta obrazložitev bo poslana obema stranema."
              rows={4}
            />
          </div>

          {/* Email Preview */}
          <div className="rounded-lg bg-muted p-4 text-sm">
            <h4 className="font-medium mb-2">Email preview (bo poslan obema)</h4>
            <p className="text-muted-foreground">
              Spoštovani,<br /><br />
              Spor za projekt "{dispute.jobTitle}" je bil rešen.<br /><br />
              <strong>Odločitev:</strong> {
                resolution === 'refund_to_customer' ? 'Vračilo stranki' :
                resolution === 'release_to_craftworker' ? 'Sprostitev obrtniku' :
                `Razdelitev (${splitPct[0]}% / ${100 - splitPct[0]}%)`
              }<br /><br />
              <strong>Obrazložitev:</strong> {reason || '[Čaka na vnos]'}<br /><br />
              Lep pozdrav,<br />
              LiftGO Tim
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Prekliči
            </Button>
            <Button 
              onClick={handleResolve} 
              disabled={loading || !reason.trim()}
            >
              {loading ? 'Obdelava...' : 'Potrdi odločitev'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
