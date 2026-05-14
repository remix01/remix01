'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface LogItem {
  id: string
  event_name: string
  performed_at: string
}

export default function MojDomPage() {
  const supabase = createClient()
  const [eventName, setEventName] = useState('')
  const [performedAt, setPerformedAt] = useState('')
  const [items, setItems] = useState<LogItem[]>([])
  const [tips, setTips] = useState<string[]>([])

  const load = async () => {
    const { data } = await supabase
      .from('home_maintenance_log')
      .select('id,event_name,performed_at')
      .order('performed_at', { ascending: false })
      .limit(20)

    setItems((data || []) as LogItem[])

    const res = await fetch('/api/ai/home-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: data || [] }),
    })
    const json = await res.json()
    if (json?.success) setTips(json.data?.tips || [])
  }

  useEffect(() => {
    load()
  }, [])

  const addLog = async () => {
    if (!eventName.trim() || !performedAt) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('home_maintenance_log').insert({ user_id: user.id, event_name: eventName, performed_at: performedAt })
    setEventName('')
    setPerformedAt('')
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moj dom</h1>
        <p className="text-muted-foreground">Vzdrževanje doma in AI nasveti</p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Dodaj vzdrževalni dogodek</h2>
        <Input value={eventName} onChange={(e: ChangeEvent<HTMLInputElement>) => setEventName(e.target.value)} placeholder="npr. Servis klime" />
        <Input type="date" value={performedAt} onChange={(e: ChangeEvent<HTMLInputElement>) => setPerformedAt(e.target.value)} />
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={addLog}>Shrani</Button>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">AI priporočila</h2>
        {tips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Dodajte nekaj dogodkov za personalizirane nasvete.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm space-y-1">
            {tips.map((tip: string) => <li key={tip}>{tip}</li>)}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">Zgodovina</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item: LogItem) => (
            <li key={item.id} className="border-b pb-2">{item.event_name} — {new Date(item.performed_at).toLocaleDateString('sl-SI')}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
