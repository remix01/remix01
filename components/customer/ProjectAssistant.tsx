'use client'

import { useMemo, useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

export function ProjectAssistant({ context }: { context: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const ask = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Manjka prijava')

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          useRAG: true,
          useTools: true,
          additionalContext: context,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || json?.error || 'Napaka AI pomočnika')
      setReply(json.response || '')
    } catch (error) {
      setReply(error instanceof Error ? error.message : 'Napaka pri odgovoru pomočnika')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed right-4 bottom-24 md:bottom-6 z-50">
      {open && (
        <Card className="w-[320px] p-3 mb-3 shadow-xl border-teal-200">
          <p className="text-sm font-semibold mb-2">AI Projektni pomočnik</p>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Vprašajte npr. Kdaj bo prišel mojster?"
          />
          <Button onClick={ask} className="mt-2 w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pošlji'}
          </Button>
          {reply && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{reply}</p>}
        </Card>
      )}

      <Button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full w-14 h-14 bg-teal-600 hover:bg-teal-700 shadow-lg"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </div>
  )
}
