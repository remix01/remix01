'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EscrowActionModal } from './EscrowActionModal'

interface Dispute {
  id: string
  jobId: string
  jobTitle: string
  customer: { name: string; email: string }
  craftworker: { name: string; email: string }
  amount: number
  platformFee: number
  disputeReason: string | null
  createdAt: string
  daysOpen: number
  violationCount: number
}

export function DisputesTable() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDisputes()
  }, [])

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/disputes')
      const data = await response.json()
      setDisputes(data)
    } catch (error) {
      console.error('[v0] Failed to fetch disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Nalaganje...</div>
  }

  if (disputes.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Ni odprtih sporov</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {disputes.map((dispute) => {
          const isExpanded = expandedId === dispute.id
          
          return (
            <div key={dispute.id} className="rounded-lg border bg-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 grid grid-cols-7 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Job #</div>
                      <div className="font-medium text-sm">{dispute.jobTitle}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Stranka</div>
                      <div className="font-medium text-sm">{dispute.customer.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Obrtnik</div>
                      <div className="font-medium text-sm">{dispute.craftworker.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Vrednost</div>
                      <div className="font-medium text-sm">€{dispute.amount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Razlog</div>
                      <div className="text-sm">{dispute.disputeReason || 'Ni naveden'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Datum</div>
                      <div className="text-sm">
                        {new Date(dispute.createdAt).toLocaleDateString('sl-SI')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Dnevi odprt</div>
                      <Badge variant={dispute.daysOpen > 7 ? 'destructive' : 'secondary'}>
                        {dispute.daysOpen}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setSelectedDispute(dispute)}
                    >
                      Reši spor
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(dispute.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <DisputeDetails jobId={dispute.jobId} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDispute && (
        <EscrowActionModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolved={fetchDisputes}
        />
      )}
    </>
  )
}

function DisputeDetails({ jobId }: { jobId: string }) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDetails()
  }, [jobId])

  const fetchDetails = async () => {
    try {
      const response = await fetch(`/api/admin/disputes/${jobId}/details`)
      const data = await response.json()
      setDetails(data)
    } catch (error) {
      console.error('[v0] Failed to fetch dispute details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="mt-4 py-4 text-sm text-muted-foreground">Nalaganje podrobnosti...</div>
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      <div>
        <h4 className="font-medium mb-2">Klepet zgodovina</h4>
        <div className="rounded-lg bg-muted p-4 max-h-64 overflow-y-auto space-y-2">
          {details?.messages?.map((msg: any) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium">{msg.sender}:</span> {msg.body}
            </div>
          ))}
        </div>
      </div>

      {details?.violations?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Kršitve ({details.violations.length})</h4>
          <div className="space-y-2">
            {details.violations.map((v: any) => (
              <div key={v.id} className="rounded-lg bg-destructive/10 p-3 text-sm">
                <Badge variant="destructive" className="mb-1">{v.type}</Badge>
                <p className="text-muted-foreground">{v.detectedContent}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-medium mb-2">Plačilni status</h4>
        <div className="rounded-lg bg-muted p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Skupaj v escrow:</span>
              <span className="ml-2 font-medium">€{details?.payment?.amount?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Platforma provizija:</span>
              <span className="ml-2 font-medium">€{details?.payment?.platformFee?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
