'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface CalendarConnectProps {
  userId: string
  role: string
  isConnected: boolean
}

export function CalendarConnect({ userId, isConnected }: CalendarConnectProps) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/calendar/connect')
      const { url } = await response.json()

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('[v0] Calendar connect error:', error)
      alert('Napaka pri povezovanju z Google Calendarjem')
    } finally {
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <h3 className="font-semibold text-green-900">Google Calendar povezan</h3>
            <p className="text-sm text-green-700">
              Termini se samodejno dodajajo v vaš koledar
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">📅</span>
          <div>
            <h3 className="font-semibold text-blue-900">Poveži Google Calendar</h3>
            <p className="text-sm text-blue-700">
              Samodejno dodaj termine v vaš Google Calendar
            </p>
          </div>
        </div>
        <Button
          onClick={handleConnect}
          disabled={loading}
          variant="default"
          className="shrink-0"
        >
          {loading ? 'Nalaganje...' : 'Poveži'}
        </Button>
      </div>
    </div>
  )
}
