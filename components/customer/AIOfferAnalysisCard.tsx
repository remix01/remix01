'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

type PonudbaLite = {
  id: string
  message?: string
  price_estimate?: number
  price_type?: string
  obrtnik?: { avg_rating?: number }
}

export function AIOfferAnalysisCard({ inquiryId, offers }: { inquiryId: string; offers: PonudbaLite[] }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!inquiryId || offers.length === 0) return

    const run = async () => {
      try {
        setError(null)
        const res = await fetch('/api/ai/analyze-offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiryId,
            offers: offers.map((offer) => ({
              id: offer.id,
              price_estimate: offer.price_estimate,
              price_type: offer.price_type,
              message: offer.message,
              rating: offer.obrtnik?.avg_rating,
            })),
          }),
        })
        const json = await res.json()
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Analiza ni uspela')
        setData(json.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Napaka pri analizi')
      }
    }

    run()
  }, [inquiryId, offers])

  if (!offers.length) return null

  return (
    <Card className="mb-4 p-4 border-purple-200 bg-purple-50/50">
      <h3 className="font-semibold text-purple-900 mb-2">AI Analiza ponudb</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-purple-800">Pripravljam primerjavo ponudb...</p>}
      {data && (
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-purple-900">Poudarki</p>
            <ul className="list-disc pl-5 text-purple-800">
              <li>Najboljše razmerje: {data?.highlights?.bestValue || 'Ni podatka'}</li>
              <li>Najhitrejša: {data?.highlights?.fastest || 'Ni podatka'}</li>
              <li>Najvišje ocenjena: {data?.highlights?.highestRated || 'Ni podatka'}</li>
            </ul>
          </div>
          {!!data?.redFlags?.length && (
            <div>
              <p className="font-medium text-purple-900">Opozorila</p>
              <ul className="list-disc pl-5 text-purple-800">
                {data.redFlags.map((flag: string) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
