'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface VerificationActionsProps {
  verificationId: string
  obrtknikId: string
}

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function VerificationActions({
  obrtknikId,
}: VerificationActionsProps) {
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      const res = await fetch(`/api/admin/providers/${obrtknikId}/approve`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Napaka pri odobritvi')
        return
      }

      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    const reason = window.prompt('Vnesite razlog za zavrnitev:')
    if (!reason?.trim()) return

    setLoading(true)
    try {
      const token = await getAuthToken()
      const res = await fetch(`/api/admin/providers/${obrtknikId}/reject`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Napaka pri zavrnitvi')
        return
      }

      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleApprove}
        disabled={loading}
        variant="default"
        className="bg-green-600 hover:bg-green-700"
      >
        ✓ Odobri
      </Button>
      <Button
        onClick={handleReject}
        disabled={loading}
        variant="outline"
        className="border-red-600 text-red-600 hover:bg-red-50"
      >
        ✕ Zavrni
      </Button>
    </>
  )
}
