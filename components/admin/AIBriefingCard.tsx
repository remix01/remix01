'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AIBriefingCard() {
  const [briefing, setBriefing] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/admin-briefing')
      const data = await res.json()
      setBriefing(data.briefing || 'Ni podatkov.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Dnevni Pregled</CardTitle>
        <Button variant="outline" size="sm" onClick={load}>Osveži</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Nalaganje...</p> : (
          <pre className="whitespace-pre-wrap text-sm leading-6">{briefing}</pre>
        )}
      </CardContent>
    </Card>
  )
}
