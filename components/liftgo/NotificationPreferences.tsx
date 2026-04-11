'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const NOTIFICATION_TYPES = [
  { id: 'new_offer', label: 'Nova ponudba', description: 'Ko obrtnik pošlje ponudbo za vaše povpraševanje' },
  { id: 'offer_accepted', label: 'Ponudba sprejeta', description: 'Ko je vaša ponudba sprejeta' },
  { id: 'payment_released', label: 'Plačilo sproščeno', description: 'Ko stranka sprosti plačilo' },
  { id: 'new_inquiry', label: 'Novo povpraševanje', description: 'Ko je novo povpraševanje v vaši kategoriji' },
]

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    new_offer: true,
    offer_accepted: true,
    payment_released: true,
    new_inquiry: true,
  })
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator)
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
    
    // Load saved preferences
    const saved = localStorage.getItem('liftgo-notification-prefs')
    if (saved) {
      try {
        setPreferences(JSON.parse(saved))
      } catch {
        localStorage.removeItem('liftgo-notification-prefs')
      }
    }
  }, [])

  const requestPermission = async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  const togglePreference = (id: string) => {
    const updated = { ...preferences, [id]: !preferences[id] }
    setPreferences(updated)
    localStorage.setItem('liftgo-notification-prefs', JSON.stringify(updated))
  }

  if (!supported) return null

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">🔔 Nastavitve obvestil</h3>
      
      {permission !== 'granted' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800 mb-3">
            Omogočite obvestila za pravočasne informacije o vaših povpraševanjih.
          </p>
          <button 
            onClick={requestPermission}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Omogoči obvestila
          </button>
        </div>
      )}

      {permission === 'denied' && (
        <p className="text-sm text-red-600 mb-4">
          Obvestila so blokirana. Omogočite jih v nastavitvah brskalnika.
        </p>
      )}

      <div className="space-y-4">
        {NOTIFICATION_TYPES.map((type) => (
          <div key={type.id} className="flex items-center justify-between">
            <div>
              <Label className="font-medium">{type.label}</Label>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </div>
            <Switch
              checked={preferences[type.id]}
              onCheckedChange={() => togglePreference(type.id)}
              disabled={permission !== 'granted'}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
