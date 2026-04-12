'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Alert = {
  id: string
  title: string
  description: string
  severity: string
  created_at: string
}

export function AdminAlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  const load = async () => {
    const res = await fetch('/api/admin/alerts')
    const json = await res.json()
    setAlerts(json.alerts || [])
  }

  useEffect(() => { load() }, [])

  const dismiss = async (id: string) => {
    await fetch(`/api/admin/alerts/${id}/dismiss`, { method: 'POST' })
    await load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Opozorila</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? <p className="text-sm text-muted-foreground">Ni odprtih opozoril.</p> : alerts.map((a) => (
          <div key={a.id} className="rounded border p-3">
            <p className="font-medium">{a.title}</p>
            <p className="text-sm text-muted-foreground">{a.description}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{a.severity.toUpperCase()} · {new Date(a.created_at).toLocaleString('sl-SI')}</span>
              <Button variant="outline" size="sm" onClick={() => dismiss(a.id)}>Dismiss</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
