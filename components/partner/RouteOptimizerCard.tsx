'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface RouteOptimizerCardProps {
  visits: Array<{ id: string; title?: string | null; location_city?: string | null; created_at?: string | null }>
}

export function RouteOptimizerCard({ visits }: RouteOptimizerCardProps) {
  const [loading, setLoading] = useState(false)
  const [optimized, setOptimized] = useState<Array<any>>([])

  const optimize = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visits: visits.map((v) => ({
            id: v.id,
            title: v.title,
            location_city: v.location_city,
            scheduled_at: v.created_at,
          })),
        }),
      })
      const payload = await res.json()
      if (payload.success) setOptimized(payload.data || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Urnik in optimizacija poti</h3>
        <Button variant="outline" onClick={optimize} disabled={loading || visits.length === 0}>
          {loading ? 'Optimiziram...' : 'Optimiziraj pot'}
        </Button>
      </div>
      {optimized.length === 0 ? (
        <p className="text-sm text-muted-foreground">Dodajte/odprite povpraševanja in optimizirajte vrstni red obiskov.</p>
      ) : (
        <ol className="list-decimal pl-6 space-y-1 text-sm">
          {optimized.map((v: any) => (
            <li key={v.id}>{v.title || 'Povpraševanje'} – {v.location_city || 'Brez lokacije'} ({v.estimatedTravelMinutes} min)</li>
          ))}
        </ol>
      )}
    </Card>
  )
}
