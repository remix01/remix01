'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, DollarSign, TrendingUp, Clock, Users, Images, Video, Sparkles } from 'lucide-react'
import { TierGate } from '@/components/partner/tier-gate'
import type { CRMData, CRMStats, CRMPipelineStage, CRMActivityItem } from '@/app/api/partner/crm/route'

const STAGE_LABELS: Record<string, string> = {
  poslana: 'Poslane ponudbe',
  sprejeta: 'Sprejete',
  zavrnjena: 'Zavrnjene',
}

function timeAgoMinutes(timestamp: string) {
  const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000)
  if (minutes < 60) return `${minutes} min nazaj`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h nazaj`
  return `${Math.floor(hours / 24)} dni nazaj`
}

export default function CRMPage() {
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [data, setData] = useState<CRMData | null>(null)

  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaAlbum, setMediaAlbum] = useState<Array<{ id: string; url: string; addedAt: string }>>([])
  const [videoDiagnosis, setVideoDiagnosis] = useState('')
  const [videoDiagnosisLoading, setVideoDiagnosisLoading] = useState(false)

  useEffect(() => {
    fetch('/api/partner/crm')
      .then(async (res) => {
        if (res.status === 403) { setForbidden(true); return }
        const json = await res.json()
        if (json.success) setData(json.data)
      })
      .catch((err) => console.error('[CRM] fetch error:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleAddMedia = () => {
    if (!mediaUrl.trim()) return
    setMediaAlbum((prev) => [{ id: crypto.randomUUID(), url: mediaUrl.trim(), addedAt: new Date().toISOString() }, ...prev])
    setMediaUrl('')
  }

  const handleVideoDiagnosis = async () => {
    const latestUrl = mediaAlbum[0]?.url
    if (!latestUrl) return
    setVideoDiagnosisLoading(true)
    setVideoDiagnosis('')
    try {
      const res = await fetch('/api/ai/analyze-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: latestUrl, inquiryText: 'Diagnoza vsebine za CRM naslednji korak in pripravo ponudbe.' }),
      })
      const json = await res.json()
      setVideoDiagnosis(json?.analysis || 'AI analiza ni bila vrnjena.')
    } catch {
      setVideoDiagnosis('Analiza ni uspela. Poskusite znova čez nekaj trenutkov.')
    } finally {
      setVideoDiagnosisLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Nalagam CRM...</p>
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <TierGate
        requiredTier="pro"
        description="CRM in generator ponudb sta na voljo samo za PRO partnerje."
      />
    )
  }

  const stats = data?.stats
  const pipeline = data?.pipeline ?? []
  const activity = data?.recentActivity ?? []

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">CRM Portal</h1>
        <p className="text-muted-foreground">Upravljajte svoje stranke in ponudbe</p>
      </div>

      {/* Media Center */}
      <Card className="mb-8 border-primary/20 bg-primary/5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">CRM Media Center (foto album + video diagnoza)</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Dodajte URL slike ali videa stranke, nato zaženite AI diagnozo za hitrejši odgovor in pripravo ponudbe.
        </p>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="https://... (slika ali video stranke)"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
          />
          <Button type="button" onClick={handleAddMedia} className="gap-2">
            <Images className="h-4 w-4" />
            Dodaj v album
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleVideoDiagnosis}
            disabled={videoDiagnosisLoading || mediaAlbum.length === 0}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            {videoDiagnosisLoading ? 'Analiziram...' : 'Video diagnoza'}
          </Button>
        </div>
        {mediaAlbum.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {mediaAlbum.slice(0, 6).map((item) => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="rounded-md border bg-background p-3 text-sm hover:bg-muted">
                <p className="truncate font-medium">{item.url}</p>
                <p className="text-xs text-muted-foreground">Dodano: {new Date(item.addedAt).toLocaleString()}</p>
              </a>
            ))}
          </div>
        )}
        {videoDiagnosis && (
          <div className="rounded-md border bg-background p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">AI DIAGNOZA</p>
            <p className="whitespace-pre-wrap text-sm">{videoDiagnosis}</p>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          { label: 'Ponudbe (ta mesec)', value: stats?.offersThisMonth ?? 0, icon: <Users className="h-6 w-6 text-blue-500" /> },
          { label: 'Sprejete (ta mesec)', value: stats?.acceptedThisMonth ?? 0, icon: <TrendingUp className="h-6 w-6 text-green-500" /> },
          { label: 'Konverzija', value: `${stats?.conversionRate ?? 0}%`, icon: <TrendingUp className="h-6 w-6 text-purple-500" /> },
          { label: 'Zaslužek (ta mesec)', value: `€${(stats?.revenueThisMonth ?? 0).toFixed(0)}`, icon: <DollarSign className="h-6 w-6 text-amber-500" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
              {icon}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Pipeline */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Vodovod prodaje</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {pipeline.map((stage: CRMPipelineStage) => (
              <Card key={stage.stage} className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{STAGE_LABELS[stage.stage] ?? stage.stage}</h3>
                  <Badge>{stage.count}</Badge>
                </div>
                <div className="space-y-2">
                  {stage.offers.map((offer) => (
                    <div key={offer.id} className="rounded bg-muted p-2 text-xs">
                      <p className="truncate font-medium">{offer.title ?? 'Ponudba'}</p>
                      {offer.price_estimate != null && (
                        <p className="text-muted-foreground">€{offer.price_estimate}</p>
                      )}
                    </div>
                  ))}
                  {stage.count > 5 && (
                    <p className="p-2 text-xs text-muted-foreground">+{stage.count - 5} več</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="mb-4 text-xl font-bold">Nedavna aktivnost</h2>
          <Card className="p-4">
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {activity.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Brez aktivnosti</p>
              ) : (
                activity.map((item: CRMActivityItem) => (
                  <div key={item.id} className="border-b pb-3 text-xs last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.description}</p>
                      {item.amount != null && (
                        <span className="whitespace-nowrap font-semibold text-green-600">
                          €{item.amount.toFixed(0)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground">{timeAgoMinutes(item.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
