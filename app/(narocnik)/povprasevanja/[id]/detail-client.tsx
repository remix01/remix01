'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PonudbeList from '@/components/narocnik/ponudbe-list'
import { AgentMatchResults } from '@/components/liftgo/AgentMatchResults'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function PovprasevanjeDetailClient({
  povprasevanje,
  ponudbe,
  id,
  createdDate,
  urgencyLabels,
  statusLabels,
  statusColors,
  urgencyColors,
}: any) {
  const router = useRouter()
  const [releasing, setReleasing] = useState(false)
  const [activePonudba, setActivePonudba] = useState<any>(null)
  const [releaseError, setReleaseError] = useState<string | null>(null)
  const [releaseSuccess, setReleaseSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('ponudbe-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ponudbe',
        filter: `povprasevanje_id=eq.${id}`,
      }, () => {
        router.refresh()
      })
      .subscribe()

    const accepted = ponudbe.find((p: any) => p.status === 'sprejeta')
    setActivePonudba(accepted)

    return () => { supabase.removeChannel(channel) }
  }, [id, ponudbe, router])

  const handleReleasePayment = async () => {
    if (!window.confirm('Ste prepričani da je delo opravljeno? Plačilo bo sproščeno mojstru.')) return
    setReleasing(true)
    setReleaseError(null)
    try {
      const res = await fetch('/api/escrow/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ponudbaId: activePonudba.id }),
      })
      if (res.ok) {
        setReleaseSuccess(true)
        router.refresh()
      } else {
        setReleaseError('Napaka pri sproščanju plačila. Poskusite znova.')
      }
    } catch {
      setReleaseError('Napaka pri sproščanju plačila. Poskusite znova.')
    } finally {
      setReleasing(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted pb-8">
      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* Section 1: Request Header */}
        <Card className="mb-8 p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className={statusColors[povprasevanje.status]}>
              {statusLabels[povprasevanje.status]}
            </Badge>
            <Badge className={urgencyColors[povprasevanje.urgency]}>
              {urgencyLabels[povprasevanje.urgency]}
            </Badge>
          </div>

          <h1 className="mb-4 text-3xl font-bold text-foreground">
            {povprasevanje.title}
          </h1>

          <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>📍 {povprasevanje.location_city}</span>
            <span>📅 {createdDate}</span>
            {povprasevanje.category?.name && (
              <span>🔧 {povprasevanje.category.name}</span>
            )}
          </div>

          <div className="mb-6 text-foreground">
            <p className="whitespace-pre-wrap">{povprasevanje.description}</p>
          </div>

          {povprasevanje.location_notes && (
            <div className="mb-4 rounded-lg bg-primary/10 p-3 text-sm text-primary">
              <strong>Opombe o lokaciji:</strong> {povprasevanje.location_notes}
            </div>
          )}

          {povprasevanje.budget_min && povprasevanje.budget_max && (
            <div className="mb-2 text-sm text-foreground">
              <strong>Proračun:</strong> {povprasevanje.budget_min} - {povprasevanje.budget_max} EUR
            </div>
          )}

          {povprasevanje.preferred_date_from && povprasevanje.preferred_date_to && (
            <div className="text-sm text-foreground">
              <strong>Željeni termin:</strong> od {new Date(povprasevanje.preferred_date_from).toLocaleDateString('sl-SI')} do {new Date(povprasevanje.preferred_date_to).toLocaleDateString('sl-SI')}
            </div>
          )}
        </Card>

        {/* Section 2: Agent Matches */}
        {povprasevanje.status === 'odprto' && (
          <div className="mb-8">
            <AgentMatchResults povprasevanjeId={id} />
          </div>
        )}

        {/* Section 3: Ponudbe */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Prejete ponudbe ({ponudbe.length})
          </h2>
          <PonudbeList
            ponudbe={ponudbe}
            povprasevanjeId={id}
            povprasevanjeStatus={povprasevanje.status}
          />
        </div>

        {/* Section 4: Payment Release */}
        {activePonudba?.status === 'sprejeta' && (
          <div className="border border-green-200 bg-green-50 rounded-xl p-6">
            <h3 className="font-semibold text-green-900 mb-2">Je mojster opravil delo?</h3>
            <p className="text-sm text-green-700 mb-4">
              Ko potrdite opravljeno delo, se plačilo sprosti mojstru.
            </p>
            {releaseError && (
              <div className="mb-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">{releaseError}</div>
            )}
            {releaseSuccess ? (
              <div className="rounded-lg bg-green-100 p-3 text-sm text-green-800">Plačilo uspešno sproščeno!</div>
            ) : (
              <button
                onClick={handleReleasePayment}
                disabled={releasing}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 w-full"
              >
                {releasing ? 'Sproščam plačilo...' : 'Potrdi opravljeno delo'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
