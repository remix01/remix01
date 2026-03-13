'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface AvailabilityToggleSectionProps {
  obrtnikId: string
  initialAvailable: boolean
  initialResponseTime: number | null
}

const RESPONSE_TIME_OPTIONS = [
  { label: '< 1 ura', value: 1 },
  { label: '2-4 ure', value: 3 },
  { label: '1 dan', value: 24 },
  { label: '2-3 dni', value: 60 },
  { label: 'Po dogovoru', value: null },
]

export function AvailabilityToggleSection({
  obrtnikId,
  initialAvailable,
  initialResponseTime,
}: AvailabilityToggleSectionProps) {
  const supabase = createClient()
  const [isAvailable, setIsAvailable] = useState(initialAvailable)
  const [responseTime, setResponseTime] = useState(initialResponseTime)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleToggleAvailability = async () => {
    setIsSaving(true)
    const newStatus = !isAvailable
    try {
      const { error } = await supabase
        .from('obrtnik_profiles')
        .update({ is_available: newStatus })
        .eq('id', obrtnikId)

      if (error) throw error
      setIsAvailable(newStatus)
      setSuccessMessage(`Status spremenjen na: ${newStatus ? 'Na voljo' : 'Zaseden'}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Napaka pri spreminjanju razpoložljivosti:', err)
      setIsAvailable(!newStatus) // Revert
    } finally {
      setIsSaving(false)
    }
  }

  const handleResponseTimeChange = async (newTime: number | null) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('obrtnik_profiles')
        .update({ response_time_hours: newTime })
        .eq('id', obrtnikId)

      if (error) throw error
      setResponseTime(newTime)
      setSuccessMessage('Čas odgovora spremenjen')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Napaka pri spreminjanju časa odgovora:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Splošna razpoložljivost</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Availability Toggle */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-900">
              Sem na voljo za nova dela
            </label>
            <button
              onClick={handleToggleAvailability}
              disabled={isSaving}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                isAvailable ? 'bg-green-500' : 'bg-slate-300'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isAvailable ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Ko ste na voljo, se vaš profil prikaže višje v rezultatih iskanja
          </p>
        </div>

        {/* Response Time Dropdown */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Čas odgovora
          </label>
          <select
            value={responseTime ?? 'null'}
            onChange={(e) =>
              handleResponseTimeChange(e.target.value === 'null' ? null : parseInt(e.target.value))
            }
            disabled={isSaving}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="null">Po dogovoru</option>
            {RESPONSE_TIME_OPTIONS.filter((opt) => opt.value !== null).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-600 mt-1">
            Kako hitro se na povpraševanja ponavadi odzvete?
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
