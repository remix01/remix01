'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Edit2 } from 'lucide-react'
import type { Offer } from '@/lib/types/offer'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  poslana: { label: 'Poslana', variant: 'default' },
  sprejeta: { label: 'Sprejeta', variant: 'default' },
  zavrnjena: { label: 'Zavrnjena', variant: 'destructive' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function OffersList({
  offers,
  onUpdate,
}: {
  offers: Offer[]
  onUpdate: () => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    message: '',
    price_estimate: '',
    available_date: '',
  })

  const startEditing = (offer: Offer) => {
    setError(null)
    setEditing(offer.id)
    setFormState({
      message: offer.message || '',
      price_estimate: offer.price_estimate ? String(offer.price_estimate) : '',
      available_date: offer.available_date ? String(offer.available_date).slice(0, 10) : '',
    })
  }

  const cancelEditing = () => {
    setEditing(null)
    setError(null)
    setFormState({
      message: '',
      price_estimate: '',
      available_date: '',
    })
  }

  const handleDelete = async (offerId: string) => {
    if (!confirm('Ste prepričani, da želite izbrisati to ponudbo?')) return

    setError(null)
    setDeleting(offerId)
    try {
      const response = await fetch(`/api/partner/offers/${offerId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Napaka pri brisanju ponudbe.')
      }

      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Napaka pri brisanju ponudbe.')
    } finally {
      setDeleting(null)
    }
  }

  const handleSave = async (offerId: string) => {
    setError(null)
    setSaving(offerId)

    const parsedPrice = Number(formState.price_estimate)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Cena mora biti večja od 0.')
      setSaving(null)
      return
    }

    try {
      const response = await fetch(`/api/partner/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: formState.message.trim(),
          price_estimate: parsedPrice,
          available_date: formState.available_date || null,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Napaka pri urejanju ponudbe.')
      }

      cancelEditing()
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Napaka pri urejanju ponudbe.')
    } finally {
      setSaving(null)
    }
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nimate oddanih ponudb.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <Card key={offer.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editing === offer.id ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">Uredi ponudbo</h3>
                    <StatusBadge status={offer.status} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor={`offer-message-${offer.id}`}>Sporočilo</Label>
                      <Textarea
                        id={`offer-message-${offer.id}`}
                        rows={5}
                        value={formState.message}
                        onChange={(e) => setFormState((prev) => ({ ...prev, message: e.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`offer-price-${offer.id}`}>Cena (EUR)</Label>
                      <Input
                        id={`offer-price-${offer.id}`}
                        type="number"
                        min={1}
                        value={formState.price_estimate}
                        onChange={(e) => setFormState((prev) => ({ ...prev, price_estimate: e.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`offer-date-${offer.id}`}>Razpoložljiv od</Label>
                      <Input
                        id={`offer-date-${offer.id}`}
                        type="date"
                        value={formState.available_date}
                        onChange={(e) => setFormState((prev) => ({ ...prev, available_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {offer.message?.split('\n')[0]?.slice(0, 60) || 'Ponudba'}
                    </h3>
                    <StatusBadge status={offer.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {offer.message}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Vrsta cene</p>
                      <p className="font-medium">{offer.price_type || 'ocena'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cena</p>
                      <p className="font-medium">€{offer.price_estimate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Razpoložljiv od</p>
                      <p className="font-medium">{offer.available_date || 'Ni določeno'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Oddano</p>
                      <p className="font-medium">
                        {new Date(offer.created_at).toLocaleDateString('sl-SI')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              {editing === offer.id ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSave(offer.id)}
                    disabled={saving === offer.id}
                  >
                    {saving === offer.id ? 'Shranjujem...' : 'Shrani'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}>
                    Prekliči
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing(offer)}
                  disabled={offer.status === 'sprejeta' || offer.status === 'zavrnjena'}
                  title={
                    offer.status === 'sprejeta' || offer.status === 'zavrnjena'
                      ? 'Sprejetih ali zavrnjenih ponudb ni mogoče urejati.'
                      : 'Uredi ponudbo'
                  }
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(offer.id)}
                disabled={deleting === offer.id || editing === offer.id}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
