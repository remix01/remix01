'use client'

/**
 * AI Business Advisor — /partner-dashboard/insights
 *
 * PRO/ELITE only. Calls /api/ai/partner-insights to get personalised
 * performance insights and lets the partner ask follow-up questions.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Send,
  Loader2,
  RefreshCw,
  Bot,
  User,
} from 'lucide-react'
import Link from 'next/link'

interface InsightMessage {
  role: 'assistant' | 'user'
  text: string
  insights?: string[]
  recommendations?: string[]
  stats?: Record<string, any>
}

export default function InsightsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [partner, setPartner] = useState<any>(null)
  const [tier, setTier] = useState<'start' | 'pro' | 'elite'>('start')
  const [loading, setLoading] = useState(true)

  // Chat state
  const [messages, setMessages] = useState<InsightMessage[]>([])
  const [question, setQuestion] = useState('')
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/partner-auth/login'); return }

      const { data: partnerData } = await supabase
        .from('obrtnik_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!partnerData) { router.replace('/partner-auth/login'); return }

      setPartner(partnerData)
      const t = partnerData.subscription_tier || 'start'
      setTier(t as 'start' | 'pro' | 'elite')
      setLoading(false)

      // Auto-run initial analysis for PRO/ELITE
      if (t === 'pro' || t === 'elite') {
        await runInsights()
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runInsights = async (q?: string) => {
    setFetching(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/partner-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Napaka pri analizi')
      }
      const d = await res.json()

      if (q) {
        // Add user question + assistant answer to chat
        setMessages((prev) => [
          ...prev,
          { role: 'user', text: q },
          {
            role: 'assistant',
            text: '',
            insights: d.insights,
            recommendations: d.recommendations,
            stats: d.stats,
          },
        ])
      } else {
        // Initial analysis — replace messages
        setMessages([
          {
            role: 'assistant',
            text: 'Pozdravljen! Tukaj je analiza vaše uspešnosti za zadnjih 30 dni.',
            insights: d.insights,
            recommendations: d.recommendations,
            stats: d.stats,
          },
        ])
      }
      setQuestion('')
    } catch (err: any) {
      setError(err.message || 'Napaka')
    } finally {
      setFetching(false)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || fetching) return
    runInsights(question.trim())
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Gate for START tier
  if (tier !== 'pro' && tier !== 'elite') {
    return (
      <div className="flex h-screen bg-background">
        <PartnerSidebar partner={partner} />
        <main className="flex-1 flex items-center justify-center p-6 pb-20 md:pb-6">
          <Card className="max-w-md p-8 text-center border-amber-200 bg-amber-50">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">PRO Paket Obvezen</h2>
            <p className="text-muted-foreground mb-6">
              Poslovni svetovalec AI je na voljo samo za PRO in ELITE partnerje.
            </p>
            <Button asChild className="w-full">
              <Link href="/cenik">Nadgradi v PRO</Link>
            </Button>
          </Card>
        </main>
        <PartnerBottomNav />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <PartnerSidebar partner={partner} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Bot className="h-7 w-7 text-purple-600" />
                Poslovni Svetovalec AI
              </h1>
              <p className="text-muted-foreground mt-1">
                Personalizirani nasveti na podlagi vaših podatkov zadnjih 30 dni
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runInsights()}
              disabled={fetching}
              className="flex-shrink-0 gap-1.5"
            >
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Osveži
            </Button>
          </div>

          {/* Chat messages */}
          <div className="space-y-4 mb-6">
            {messages.length === 0 && !fetching && (
              <Card className="p-8 text-center text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 text-purple-400" />
                <p>Pripravljam analizo vaše uspešnosti...</p>
              </Card>
            )}

            {fetching && messages.length === 0 && (
              <Card className="p-6 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <p className="text-muted-foreground">Analiziram vaše podatke...</p>
              </Card>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                )}
                <div className={`max-w-full flex-1 space-y-3 ${msg.role === 'user' ? 'max-w-xs' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 text-sm ml-auto inline-block">
                      {msg.text}
                    </div>
                  ) : (
                    <>
                      {msg.text && <p className="text-sm text-muted-foreground">{msg.text}</p>}

                      {/* Stats bar */}
                      {msg.stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Poslane', value: msg.stats.totalSent },
                            { label: 'Sprejete', value: msg.stats.totalAccepted },
                            {
                              label: 'Konverzija',
                              value: `${msg.stats.conversionRate}%`,
                              trend: msg.stats.conversionTrend,
                            },
                            { label: 'Povp. cena', value: msg.stats.avgPrice ? `€${msg.stats.avgPrice}` : '—' },
                          ].map((s) => (
                            <Card key={s.label} className="p-3 text-center">
                              <p className="text-xs text-muted-foreground">{s.label}</p>
                              <p className="text-xl font-bold">{s.value}</p>
                              {s.trend !== undefined && (
                                <p className={`text-xs ${s.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {s.trend >= 0 ? '▲' : '▼'} {Math.abs(s.trend)}% vs. prej
                                </p>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Insights */}
                      {msg.insights && msg.insights.length > 0 && (
                        <Card className="p-4 bg-blue-50 border-blue-200">
                          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" /> Opažanja
                          </p>
                          <ul className="space-y-1.5">
                            {msg.insights.map((ins, i) => (
                              <li key={i} className="text-sm text-blue-900 flex gap-2">
                                <span className="text-blue-400 flex-shrink-0">•</span>
                                {ins}
                              </li>
                            ))}
                          </ul>
                        </Card>
                      )}

                      {/* Recommendations */}
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <Card className="p-4 bg-green-50 border-green-200">
                          <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                            <Lightbulb className="h-3.5 w-3.5" /> Priporočila
                          </p>
                          <ul className="space-y-1.5">
                            {msg.recommendations.map((rec, i) => (
                              <li key={i} className="text-sm text-green-900 flex gap-2">
                                <span className="text-green-500 flex-shrink-0">{i + 1}.</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </Card>
                      )}
                    </>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming indicator for follow-up */}
            {fetching && messages.length > 0 && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
                <Card className="p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  <span className="text-sm text-muted-foreground">Analiziram...</span>
                </Card>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Question input */}
          <form onSubmit={handleSend} className="flex gap-2 sticky bottom-4">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Vprašajte svetovalca... (npr. Kako povečati konverzijo?)"
              disabled={fetching}
              className="bg-background"
            />
            <Button type="submit" disabled={!question.trim() || fetching} className="flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </main>
      <PartnerBottomNav />
    </div>
  )
}
