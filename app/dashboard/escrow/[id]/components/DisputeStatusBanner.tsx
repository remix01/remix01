'use client'

import { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EscrowActionModal } from '@/components/admin/EscrowActionModal'

interface Dispute {
  id: string
  escrow_id: string
  opened_by: string
  opened_by_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
  resolved_at: string | null
  resolution: string | null
  admin_notes: string | null
}

interface DisputeStatusBannerProps {
  dispute: Dispute
  escrowId: string
  customerName: string
  partnerName: string
  amount: number
  isAdmin?: boolean
  onResolveCompleted?: () => void
}

export function DisputeStatusBanner({
  dispute,
  escrowId,
  customerName,
  partnerName,
  amount,
  isAdmin = false,
  onResolveCompleted,
}: DisputeStatusBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedForResolution, setSelectedForResolution] = useState<Dispute | null>(null)

  const daysOpen = Math.floor(
    (Date.now() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  const getResolutionLabel = (resolution: string) => {
    switch (resolution) {
      case 'refund':
        return 'Vračilo stranki'
      case 'partial_refund':
        return 'Delno vračilo'
      case 'release':
        return 'Sprostitev obrtniku'
      case 'mediation':
        return 'Mediacija'
      default:
        return resolution
    }
  }

  const getStatusBgColor = () => {
    if (dispute.status === 'resolved') {
      return 'bg-green-50 border-green-200'
    }
    return 'bg-amber-50 border-amber-200'
  }

  return (
    <>
      <Card className={`border-2 ${getStatusBgColor()}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">
                {dispute.status === 'resolved' ? (
                  <div className="rounded-full bg-green-100 p-2">
                    <AlertCircle className="h-5 w-5 text-green-600" />
                  </div>
                ) : (
                  <div className="rounded-full bg-amber-100 p-2 animate-pulse">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {dispute.status === 'resolved' ? 'Spor je rešen' : 'Spor v teku'}
                </CardTitle>
                <CardDescription>
                  {dispute.status === 'resolved'
                    ? `Rešen je: ${getResolutionLabel(dispute.resolution || '')}`
                    : 'Naš tim bo pregledal in odgovoren v 48 urah'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && dispute.status === 'open' && (
                <Button
                  size="sm"
                  onClick={() => setSelectedForResolution(dispute)}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Reši spor
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              {/* Timeline */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Datum odprtja</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(dispute.created_at).toLocaleDateString('sl-SI')} (
                    {daysOpen} {daysOpen === 1 ? 'dan' : 'dni'} nazaj)
                  </p>
                </div>

                {dispute.resolved_at && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Datum rešitve</p>
                    <p className="text-sm font-medium mt-1">
                      {new Date(dispute.resolved_at).toLocaleDateString('sl-SI')}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Reason */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Razlog</p>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-foreground">{dispute.reason}</p>
                </div>
              </div>

              {/* Description */}
              {dispute.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                    Dodatni opis
                  </p>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {dispute.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <Badge
                  variant={dispute.status === 'resolved' ? 'secondary' : 'default'}
                  className={
                    dispute.status === 'resolved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }
                >
                  {dispute.status === 'resolved' ? 'Rešen' : 'Odprt'}
                </Badge>
              </div>

              {/* Resolution Details */}
              {dispute.status === 'resolved' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                        Odločitev
                      </p>
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <p className="text-sm font-medium text-green-900">
                          {getResolutionLabel(dispute.resolution || '')}
                        </p>
                      </div>
                    </div>

                    {dispute.admin_notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                          Opombe admina
                        </p>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {dispute.admin_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </>
        )}
      </Card>

      {/* Resolution Modal */}
      {selectedForResolution && isAdmin && (
        <EscrowActionModal
          dispute={{
            id: selectedForResolution.id,
            jobId: escrowId,
            jobTitle: `Transakcija ${escrowId.slice(0, 8)}`,
            customer: { name: customerName, email: '' },
            craftworker: { name: partnerName, email: '' },
            amount,
            platformFee: 0,
          }}
          onClose={() => setSelectedForResolution(null)}
          onResolved={() => {
            setSelectedForResolution(null)
            onResolveCompleted?.()
          }}
        />
      )}
    </>
  )
}
