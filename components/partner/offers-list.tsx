'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit2 } from 'lucide-react'

export function OffersList({
  offers,
  partnerId,
  onUpdate,
}: {
  offers: any[]
  partnerId: string
  onUpdate: () => void
}) {
  const supabase = createClient()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (offerId: string) => {
    if (!confirm('Ste prepričani, da želite izbrisati to ponudbo?')) return

    setDeleting(offerId)
    try {
      await supabase.from('ponudbe').delete().eq('id', offerId)
      onUpdate()
    } catch (err) {
      console.error('Napaka pri brisanju:', err)
    } finally {
      setDeleting(null)
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
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {offer.title}
                </h3>
                <Badge variant={offer.status === 'poslana' ? 'default' : 'secondary'}>
                  {offer.status === 'poslana' ? 'Poslana' : offer.status}
                </Badge>
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
            </div>
            <div className="flex gap-2 ml-4">
              <Button variant="ghost" size="sm" disabled>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(offer.id)}
                disabled={deleting === offer.id}
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
