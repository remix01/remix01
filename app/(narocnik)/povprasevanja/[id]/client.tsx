'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PonudbeList from '@/components/narocnik/ponudbe-list'
import { AgentMatchResults } from '@/components/liftgo/AgentMatchResults'
import { AgentDialog } from '@/components/agents/AgentDialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OfferComparisonAgent } from '@/components/agent/OfferComparisonAgent'
import { SchedulingAssistant } from '@/components/agent/SchedulingAssistant'

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

  useEffect(() => {
    // Subscribe to realtime changes
    const supabase = createClient()
    const channel = supabase
      .channel('ponudbe-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ponudbe',
        filter: `povprasevanje_id=eq.${id}`
      }, () => {
        router.refresh()
      })
      .subscribe()

    // Find accepted ponudba
    const accepted = ponudbe.find((p: any) => p.status === 'sprejeta')
    setActivePonudba(accepted)

    return () => { supabase.removeChannel(channel) }
  }, [id, ponudbe, router])

  const handleReleasePayment = async () => {
    if (!confirm('Ste prepričani da je delo opravljeno? Plačilo bo sproščeno mojstru.')) return
    setReleasing(true)
    try {
      const res = await fetch('/api/escrow/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ponudbaId: activePonudba.id })
      })
      if (res.ok) {
        alert('✅ Plačilo uspešno sproščeno!')
        router.refresh()
      } else {
        alert('Napaka pri sproščanju plačila.')
      }
    } catch {
      alert('Napaka pri sproščanju plačila.')
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

        {/* Section 2: Agent Matches (only if status is odprto) */}
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

          {/* Offer comparison — visible when 2+ pending offers */}
          {ponudbe.filter((p: any) => p.status === 'poslana').length >= 2 && (
            <div className="mb-4">
              <OfferComparisonAgent
                povprasevanjeId={id}
                ponudbeCount={ponudbe.filter((p: any) => p.status === 'poslana').length}
              />
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">
              Prejete ponudbe ({ponudbe.length})
            </h2>
            {ponudbe.length >= 2 && (
              <AgentDialog
                agentType="offer_comparison"
                context={{
                  povprasevanje: {
                    title: povprasevanje.title,
                    description: povprasevanje.description,
                    budget_min: povprasevanje.budget_min,
                    budget_max: povprasevanje.budget_max,
                  },
                  ponudbe: ponudbe.map((p: any) => ({
                    id: p.id,
                    mojster: p.mojster_name ?? p.mojster_id,
                    cena: p.price,
                    rok: p.estimated_days,
                    ocene: p.rating,
                    stevilo_ocen: p.reviews_count,
                    opis: p.description?.slice(0, 200),
                    garancija: p.warranty,
                  })),
                }}
                triggerLabel="Primerjaj ponudbe"
                triggerClassName="text-xs text-teal-600 border-teal-200 hover:bg-teal-50"
                initialMessage="Primerjaj prejete ponudbe in mi priporoči najboljšo."
              />
            )}
          </div>
          <PonudbeList
            ponudbe={ponudbe}
            povprasevanjeId={id}
            povprasevanjeStatus={povprasevanje.status}
          />
        </div>

        {/* Section 4: Scheduling — shown when offer is accepted */}
        {activePonudba?.status === 'sprejeta' && (
          <div className="mb-6">
            <SchedulingAssistant
              ponudbaId={activePonudba.id}
              obrtnikName={activePonudba.obrtnik?.business_name}
              onScheduled={() => router.refresh()}
            />
          </div>
        )}

        {/* Section 5: Payment Release UI */}
        {activePonudba?.status === 'sprejeta' && (
          <div className="border border-green-200 bg-green-50 rounded-xl p-6">
            <h3 className="font-semibold text-green-900 mb-2">✅ Je mojster opravil delo?</h3>
            <p className="text-sm text-green-700 mb-4">
              Ko potrdite opravljeno delo, se plačilo sprosti mojstru.
            </p>
            <button
              onClick={handleReleasePayment}
              disabled={releasing}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 w-full"
            >
              {releasing ? 'Sproščam plačilo...' : '✅ Potrdi opravljeno delo'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
