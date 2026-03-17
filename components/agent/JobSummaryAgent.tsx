'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, FileText, Send, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Summary = {
  id: string
  summary_text: string
  materials_used: any[]
  hours_worked: number | null
  status: 'draft' | 'sent' | 'confirmed'
  generated_at: string
}

interface Props {
  ponudbaId: string
  jobTitle?: string
}

export function JobSummaryAgent({ ponudbaId, jobTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [sending, setSending] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [status, setStatus] = useState<'idle' | 'pending' | 'ready' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [hoursWorked, setHoursWorked] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Poll for completion
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/job-summary?ponudbaId=${ponudbaId}`)
      const data = await res.json()
      if (data.status === 'ready' && data.summary) {
        setSummary(data.summary)
        setStatus('ready')
        setPolling(false)
      }
    } catch {
      // silent
    }
  }, [ponudbaId])

  useEffect(() => {
    if (!open) return
    // Check existing on open
    pollStatus()
  }, [open, pollStatus])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [polling, pollStatus])

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/job-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ponudbaId,
          hoursWorked: hoursWorked ? Number(hoursWorked) : undefined,
          additionalNotes: additionalNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')

      if (data.alreadyGenerated && data.existing) {
        setSummary(data.existing)
        setStatus('ready')
      } else {
        setStatus('pending')
        setPolling(true)
      }
    } catch (e: any) {
      setError(e.message || 'Napaka pri zahtevi.')
    } finally {
      setLoading(false)
    }
  }

  const sendToCustomer = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/job-summary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ponudbaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')
      setStatus('sent')
    } catch (e: any) {
      setError(e.message || 'Napaka pri pošiljanju.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Poročilo o opravljenem delu
        </span>
        <div className="flex items-center gap-2">
          {status === 'sent' && <Badge className="bg-green-100 text-green-700 text-xs">Poslano</Badge>}
          {status === 'ready' && <Badge className="bg-sky-100 text-sky-700 text-xs">Pripravljeno</Badge>}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          {status === 'idle' && (
            <>
              <p className="text-xs text-sky-600">
                AI pripravi profesionalno poročilo za stranko — opis opravljenih del, material, garancija.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="Porabljene ure"
                  className="text-sm bg-white"
                />
                <Input
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Opomba (neobvezno)"
                  className="text-sm bg-white"
                />
              </div>
              <Button
                type="button"
                onClick={generate}
                disabled={loading}
                size="sm"
                className="bg-sky-600 hover:bg-sky-700 w-full"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pošiljam zahtevo...</>
                ) : (
                  'Generiraj poročilo'
                )}
              </Button>
            </>
          )}

          {status === 'pending' && (
            <div className="flex items-center gap-3 py-4 justify-center">
              <Clock className="w-5 h-5 text-sky-600 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-sky-700">Poročilo se generira...</p>
                <p className="text-xs text-sky-500">Preverjam vsakih 3 sekunde</p>
              </div>
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
            </div>
          )}

          {(status === 'ready' || status === 'sent') && summary && (
            <div className="space-y-3">
              <Card className="p-3 bg-white border-sky-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500">Poročilo za stranko</p>
                  {summary.hours_worked && (
                    <Badge variant="outline" className="text-xs">
                      {summary.hours_worked} h
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-6">
                  {summary.summary_text}
                </p>
              </Card>

              {/* Materials used */}
              {summary.materials_used?.length > 0 && (
                <div className="text-xs text-slate-500">
                  <p className="font-medium mb-1">Porabljeni material:</p>
                  {(summary.materials_used as any[]).map((m, i) => (
                    <p key={i}>• {m.name}: {m.quantity}{m.price ? ` (${m.price} EUR)` : ''}</p>
                  ))}
                </div>
              )}

              {status === 'ready' && (
                <Button
                  type="button"
                  onClick={sendToCustomer}
                  disabled={sending}
                  size="sm"
                  className="bg-sky-600 hover:bg-sky-700 w-full"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pošiljam...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Pošlji stranki</>
                  )}
                </Button>
              )}

              {status === 'sent' && (
                <div className="flex items-center gap-2 justify-center text-green-700 py-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Poročilo poslano stranki</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => { setStatus('idle'); setSummary(null) }}
                className="text-xs text-slate-400 hover:text-slate-600 w-full text-center"
              >
                Generiraj novo poročilo
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
