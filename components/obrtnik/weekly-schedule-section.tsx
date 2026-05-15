'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface ScheduleEntry {
  day_of_week: number
  is_available: boolean
  time_from: string
  time_to: string
}

interface WeeklyScheduleSectionProps {
  obrtnikId: string
  initialSchedule: Array<{
    id: string
    day_of_week: number
    is_available: boolean | null
    time_from: string | null
    time_to: string | null
  }>
}

const DAYS_SL = ['Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota', 'Nedelja']
const WEEKDAY_INDICES = [0, 1, 2, 3, 4]
const WEEKEND_INDICES = [5, 6]

export function WeeklyScheduleSection({
  obrtnikId,
  initialSchedule,
}: WeeklyScheduleSectionProps) {
  const supabase = createClient()
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(
    DAYS_SL.map((_, i) => {
      const existing = initialSchedule.find((s) => s.day_of_week === i)
      return {
        day_of_week: i,
        is_available: existing?.is_available ?? false,
        time_from: existing?.time_from ?? '08:00',
        time_to: existing?.time_to ?? '17:00',
      }
    })
  )
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleToggleDay = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((entry) =>
        entry.day_of_week === dayIndex
          ? { ...entry, is_available: !entry.is_available }
          : entry
      )
    )
  }

  const handleTimeChange = (dayIndex: number, field: 'time_from' | 'time_to', value: string) => {
    setSchedule((prev) =>
      prev.map((entry) =>
        entry.day_of_week === dayIndex ? { ...entry, [field]: value } : entry
      )
    )
  }

  const copyToWeekdays = () => {
    const monday = schedule[0]
    setSchedule((prev) =>
      prev.map((entry) =>
        WEEKDAY_INDICES.includes(entry.day_of_week)
          ? {
              ...entry,
              is_available: monday.is_available,
              time_from: monday.time_from,
              time_to: monday.time_to,
            }
          : entry
      )
    )
  }

  const copyToWeekend = () => {
    const saturday = schedule[5]
    setSchedule((prev) =>
      prev.map((entry) =>
        WEEKEND_INDICES.includes(entry.day_of_week)
          ? {
              ...entry,
              is_available: saturday.is_available,
              time_from: saturday.time_from,
              time_to: saturday.time_to,
            }
          : entry
      )
    )
  }

  const saveSchedule = async () => {
    setIsSaving(true)
    try {
      for (const entry of schedule) {
        const { error } = await supabase
          .from('obrtnik_availability')
          .upsert(
            {
              obrtnik_id: obrtnikId,
              day_of_week: entry.day_of_week,
              is_available: entry.is_available,
              time_from: entry.is_available ? entry.time_from : null,
              time_to: entry.is_available ? entry.time_to : null,
            },
            { onConflict: 'obrtnik_id,day_of_week' }
          )

        if (error) throw error
      }
      setSuccessMessage('Urnik je bil uspešno spremenjen')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Napaka pri shranjevanju urnika:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const getPreview = () => {
    const workdaySchedule = schedule.filter((s) => s.day_of_week < 5 && s.is_available)
    const weekendSchedule = schedule.filter((s) => s.day_of_week >= 5 && s.is_available)

    const parts: string[] = []
    if (workdaySchedule.length > 0) {
      parts.push(
        `Pon-Pet ${workdaySchedule[0].time_from}-${workdaySchedule[0].time_to}`
      )
    }
    if (weekendSchedule.length > 0) {
      parts.push(
        `Sob-Ned ${weekendSchedule[0].time_from}-${weekendSchedule[0].time_to}`
      )
    }

    return parts.length > 0
      ? parts.join(', ')
      : 'Prikazano bo: Ni definirano'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tedenski urnik</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {schedule.map((entry, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-200 hover:bg-slate-50 transition"
                >
                  <td className="py-3 px-2 w-12">
                    <button
                      onClick={() => handleToggleDay(idx)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        entry.is_available ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          entry.is_available ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-2 font-medium text-slate-900 w-24">
                    {DAYS_SL[idx]}
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="time"
                      value={entry.time_from}
                      onChange={(e) => handleTimeChange(idx, 'time_from', e.target.value)}
                      disabled={!entry.is_available}
                      className="px-2 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </td>
                  <td className="py-3 px-2 text-slate-600">-</td>
                  <td className="py-3 px-2">
                    <input
                      type="time"
                      value={entry.time_to}
                      onChange={(e) => handleTimeChange(idx, 'time_to', e.target.value)}
                      disabled={!entry.is_available}
                      className="px-2 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Copy Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={copyToWeekdays}
            className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg transition"
          >
            Kopiraj na vse delovnike (Pon-Pet)
          </button>
          <button
            onClick={copyToWeekend}
            className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg transition"
          >
            Kopiraj na vikend
          </button>
          <button
            onClick={saveSchedule}
            disabled={isSaving}
            className="ml-auto px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {isSaving ? 'Shranjevanje...' : 'Shrani urnik'}
          </button>
        </div>

        {/* Preview */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Vaš urnik na profilu:</strong> {getPreview()}
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
