'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ObrtnikReplyFormProps {
  reviewId: string
  onReplyAdded: () => void
}

export function ObrtnikReplyForm({ reviewId, onReplyAdded }: ObrtnikReplyFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxChars = 300

  const handleSubmit = async () => {
    if (!reply.trim()) {
      setError('Napišite odgovor')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obrtnik_reply: reply }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Napaka pri shranjevanju')
        return
      }

      setReply('')
      setIsOpen(false)
      onReplyAdded()
    } catch (err) {
      setError('Napaka pri shranjevanju')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-blue-600 hover:underline mt-3"
      >
        Odgovori
      </button>
    )
  }

  return (
    <div className="bg-blue-50 p-4 rounded mt-3 space-y-2">
      {error && <div className="text-xs text-red-600">{error}</div>}
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value.slice(0, maxChars))}
        placeholder="Napišite odgovor..."
        className="w-full h-16 p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {reply.length}/{maxChars}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsOpen(false)
              setReply('')
              setError(null)
            }}
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
          >
            Prekliči
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reply.trim()}
            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {submitting ? 'Pošiljam...' : 'Objavi'}
          </button>
        </div>
      </div>
    </div>
  )
}
