'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Clock, Banknote, Tag, ChevronDown, ChevronUp, Sparkles, MessageSquare, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'

interface Povprasevanje {
  id: string
  title: string
  description: string | null
  status: string
  location_city: string | null
  urgency: string | null
  budget_min: number | null
  budget_max: number | null
  created_at: string
  categories: { name: string; icon_name: string } | null
}

interface InquiryAnalysis {
  summary: string
  materials: string[]
  duration: string
  redFlags: string[]
}

export default function PovprasevanjeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [povprasevanje, setPovprasevanje] = useState<Povprasevanje | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paket, setPaket] = useState<'start' | 'pro' | 'elite'>('start')

  const [message, setMessage] = useState('')
  const [priceEstimate, setPriceEstimate] = useState('')
  const [availableDate, setAvailableDate] = useState('')

  // AI Inquiry Analysis (Phase 2.1)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [analysis, setAnalysis] = useState<InquiryAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // AI Quick Replies (Phase 2.3)
  const [repliesLoading, setRepliesLoading] = useState(false)
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [repliesError, setRepliesError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/partner-auth/login')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || profile.role !== 'obrtnik') {
        router.replace('/partner-auth/login')
        setLoading(false)
        return
      }

      const { data: partnerData } = await supabase
        .from('obrtnik_profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle()

      if (partnerData?.subscription_tier === 'elite') setPaket('elite')
      else if (partnerData?.subscription_tier === 'pro') setPaket('pro')

      const { data, error: fetchError } = await supabase
        .from('povprasevanja')
        .select(`
          id,
          title,
          description,
          status,
          location_city,
          urgency,
          budget_min,
          budget_max,
          created_at,
          categories:category_id(name, icon_name)
        `)
        .eq('id', id)
        .maybeSingle()

      if (fetchError || !data) {
        console.error('[povprasevanje-detail] fetch error:', fetchError?.message)
        setError('Povpraševanje ni bilo najdeno.')
        setLoading(false)
        return
      }

      // === Authorization check (Fix 1.6) ===
      // Partners may view open inquiries OR inquiries where they already submitted a bid.
      const isOpen = data.status === 'odprto'
      if (!isOpen) {
        const { count } = await supabase
          .from('ponudbe')
          .select('id', { count: 'exact', head: true })
          .eq('povprasevanje_id', id)
          .eq('obrtnik_id', user.id)

        if (!count || count === 0) {
          setError('Nimate dostopa do tega povpraševanja.')
          setLoading(false)
          return
        }
      }

      setPovprasevanje(data as Povprasevanje)
      setLoading(false)
    }

    fetchData()
  }, [id, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('Sporočilo je obvezno.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/partner-auth/login')
      return
    }

    const { error: insertError } = await supabase
      .from('ponudbe')
      .insert({
        povprasevanje_id: id,
        obrtnik_id: user.id,
        message: message.trim(),
        price_estimate: priceEstimate ? parseFloat(priceEstimate) : null,
        price_type: 'fiksna',
        available_date: availableDate || null,
        status: 'poslana',
      })

    if (insertError) {
      console.error('[ponudba] insert error:', insertError.message)
      setError('Napaka pri pošiljanju ponudbe. Prosimo, poskusite znova.')
    } else {
      setSubmitted(true)
    }

    setSubmitting(false)
  }

  /** Phase 2.1 — fetch AI analysis for this inquiry */
  const handleAnalyze = async () => {
    if (analysis) {
      setAnalysisOpen((v) => !v)
      return
    }
    setAnalysisOpen(true)
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/ai/analyze-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: id,
          title: povprasevanje?.title,
          description: povprasevanje?.description,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Napaka pri analizi')
      }
      const d = await res.json()
      setAnalysis(d.analysis)
    } catch (err: any) {
      setAnalysisError(err.message || 'Napaka pri AI analizi')
    } finally {
      setAnalysisLoading(false)
    }
  }

  /** Phase 2.3 — generate AI quick-reply suggestions */
  const handleGenerateReplies = async () => {
    setRepliesLoading(true)
    setRepliesError(null)
    setQuickReplies([])
    try {
      const res = await fetch('/api/ai/generate-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryTitle: povprasevanje?.title,
          inquiryDescription: povprasevanje?.description,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Napaka pri generiranju odgovorov')
      }
      const d = await res.json()
      setQuickReplies(d.replies || [])
    } catch (err: any) {
      setRepliesError(err.message || 'Napaka pri generiranju odgovorov')
    } finally {
      setRepliesLoading(false)
    }
  }

  const timeAgo = (createdAt: string) => {
    const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    if (hoursAgo < 1) return 'pred manj kot uro'
    if (hoursAgo < 24) return `pred ${Math.floor(hoursAgo)}h`
    const daysAgo = Math.floor(hoursAgo / 24)
    return `pred ${daysAgo} ${daysAgo === 1 ? 'dnem' : 'dnevi'}`
  }

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `${min.toLocaleString('sl-SI')} – ${max.toLocaleString('sl-SI')} €`
    if (max) return `do ${max.toLocaleString('sl-SI')} €`
    if (min) return `od ${min.toLocaleString('sl-SI')} €`
    return null
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Nalagam...</p>
      </div>
    )
  }

  if (!povprasevanje) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error || 'Povpraševanje ni bilo najdeno.'}</p>
        <Link href="/partner-dashboard/povprasevanja">
          <Button variant="outline">Nazaj na seznam</Button>
        </Link>
      </div>
    )
  }

  const budget = formatBudget(povprasevanje.budget_min, povprasevanje.budget_max)
  const categoryName = (povprasevanje.categories as any)?.name ?? 'Splošno'

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
          {/* Back */}
          <Link href="/partner-dashboard/povprasevanja" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Nazaj na povpraševanja
          </Link>

          {/* Inquiry details */}
          <Card className="p-5 mb-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {categoryName}
                </span>
                {povprasevanje.urgency === 'nujno' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    Nujno
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-foreground">{povprasevanje.title}</h1>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {povprasevanje.location_city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{povprasevanje.location_city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{timeAgo(povprasevanje.created_at)}</span>
                </div>
              </div>

              {povprasevanje.description && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {povprasevanje.description}
                </p>
              )}

              {budget && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Banknote className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Budget: {budget}</span>
                </div>
              )}
            </div>
          </Card>

          {/* === Phase 2.1: AI Analysis Section === */}
          <Card className="mb-4 overflow-hidden">
            <button
              onClick={handleAnalyze}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">AI Analiza povpraševanja</span>
              </div>
              {analysisOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {analysisOpen && (
              <div className="px-4 pb-4 border-t">
                {analysisLoading && (
                  <div className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analiziram povpraševanje...
                  </div>
                )}
                {analysisError && (
                  <p className="pt-4 text-sm text-red-500">{analysisError}</p>
                )}
                {analysis && !analysisLoading && (
                  <div className="pt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Povzetek</p>
                      <p className="text-sm">{analysis.summary}</p>
                    </div>
                    {analysis.materials.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Predvideni materiali</p>
                        <ul className="text-sm list-disc list-inside space-y-0.5">
                          {analysis.materials.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Ocenjeno trajanje</p>
                      <p className="text-sm">{analysis.duration}</p>
                    </div>
                    {analysis.redFlags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 text-amber-600">Opozorila</p>
                        <ul className="text-sm list-disc list-inside space-y-0.5 text-amber-700">
                          {analysis.redFlags.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Offer form */}
          {submitted ? (
            <Card className="p-8 text-center">
              <p className="text-lg font-semibold text-foreground mb-2">Ponudba uspešno poslana!</p>
              <p className="text-sm text-muted-foreground mb-6">
                Naročnik bo pregledal vašo ponudbo in vas kontaktiral.
              </p>
              <Link href="/partner-dashboard/povprasevanja">
                <Button variant="outline">Nazaj na seznam</Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">Pošlji ponudbo</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message">Sporočilo naročniku *</Label>
                    {/* === Phase 2.3: AI Quick Replies === */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-purple-600 hover:text-purple-700"
                      onClick={handleGenerateReplies}
                      disabled={repliesLoading}
                    >
                      {repliesLoading
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <MessageSquare className="h-3 w-3" />}
                      Predlogi odgovorov
                    </Button>
                  </div>

                  {/* Quick reply chips */}
                  {quickReplies.length > 0 && (
                    <div className="flex flex-col gap-2 mb-2">
                      {quickReplies.map((reply, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setMessage(reply)}
                          className="text-left text-xs px-3 py-2 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 transition-colors"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  {repliesError && <p className="text-xs text-red-500">{repliesError}</p>}

                  <Textarea
                    id="message"
                    placeholder="Opišite svojo storitev, izkušnje in zakaj ste pravi izbor..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price">Okvirna cena (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="npr. 250"
                    value={priceEstimate}
                    onChange={(e) => setPriceEstimate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date">Razpoložljiv od</Label>
                  <Input
                    id="date"
                    type="date"
                    value={availableDate}
                    onChange={(e) => setAvailableDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px]"
                >
                  {submitting ? 'Pošiljam...' : 'Pošlji ponudbo'}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </main>
      <PartnerBottomNav paket={{ paket }} />
    </div>
  )
}
