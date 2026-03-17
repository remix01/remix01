'use client'

import { useState } from 'react'
import { Loader2, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Slot = {
  date: string
  startTime: string
  endTime: string
  label: string
  reason: string
}

type Suggestions = {
  slots: Slot[]
  message: string
  calendarIntegration: boolean
}

interface Props {
  ponudbaId: string
  obrtnikName?: string
  onScheduled?: (appointmentData: any) => void
}

export function SchedulingAssistant({ ponudbaId, obrtnikName, onScheduled }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [preferences, setPreferences] = useState('')
  const [preferredTime, setPreferredTime] = useState<'zjutraj' | 'popoldne' | 'kdajkoli'>('kdajkoli')
  const [scheduled, setScheduled] = useState(false)

  const getSuggestions = async () => {
    setLoading(true)
    setError(null)
    setSuggestions(null)
    setSelectedSlot(null)
    try {
      const res = await fetch('/api/agent/scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ponudbaId,
          preferredDates: preferences,
          preferredTimeOfDay: preferredTime,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')
      if (data.alreadyScheduled) {
        setScheduled(true)
        return
      }
      setSuggestions(data.suggestions)
    } catch (e: any) {
      setError(e.message || 'Napaka pri pripravi terminov.')
    } finally {
      setLoading(false)
    }
  }

  const confirmSlot = async (slot: Slot) => {
    setConfirming(true)
    setError(null)
    try {
      const scheduledStart = new Date(`${slot.date}T${slot.startTime}:00`).toISOString()
      const scheduledEnd = new Date(`${slot.date}T${slot.endTime}:00`).toISOString()

      const res = await fetch('/api/agent/scheduling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ponudbaId, scheduledStart, scheduledEnd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')
      setScheduled(true)
      onScheduled?.(data)
    } catch (e: any) {
      setError(e.message || 'Napaka pri potrditvi termina.')
    } finally {
      setConfirming(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  if (scheduled) {
    return (
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Termin je dogovorjen!</span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          Prejeli boste obvestilo s potrditvijo termina.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="font-semibold text-purple-900 text-sm">Dogovorite termin</h3>
            {obrtnikName && (
              <p className="text-xs text-purple-600">z {obrtnikName}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
        >
          {open ? 'Skrij' : 'Odpri'}
        </button>
      </div>

      {open && (
        <div className="space-y-4">
          {/* Preferences */}
          {!suggestions && (
            <>
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1 block">
                  Vaše preference (neobvezno)
                </Label>
                <Input
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="npr. ne v ponedeljek, raje ob koncu tedna"
                  className="text-sm bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700 mb-2 block">Čas dneva</Label>
                <div className="flex gap-2">
                  {(['zjutraj', 'popoldne', 'kdajkoli'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPreferredTime(t)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        preferredTime === t
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      {t === 'zjutraj' ? '🌅 Zjutraj' : t === 'popoldne' ? '🌞 Popoldne' : '🕐 Kdajkoli'}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={getSuggestions}
                disabled={loading}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 w-full"
              >
                {loading ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Iščem termine...</>
                ) : (
                  'Poišči proste termine'
                )}
              </Button>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {suggestions && (
            <div className="space-y-3">
              {suggestions.message && (
                <p className="text-xs text-slate-600 italic">{suggestions.message}</p>
              )}

              <div className="space-y-2">
                {suggestions.slots.map((slot, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border p-3 cursor-pointer transition-all ${
                      selectedSlot === slot
                        ? 'border-purple-500 bg-purple-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800">{formatDate(slot.date)}</span>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {slot.startTime} – {slot.endTime}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{slot.reason}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => selectedSlot && confirmSlot(selectedSlot)}
                  disabled={!selectedSlot || confirming}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 flex-1"
                >
                  {confirming ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Potrjujem...</>
                  ) : (
                    'Potrdi termin'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSuggestions(null); setSelectedSlot(null) }}
                  className="border-purple-200 text-purple-700"
                >
                  Nazaj
                </Button>
              </div>

              {suggestions.calendarIntegration && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Termin bo dodan v Google Koledar
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
