'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MarkCompleteButtonProps {
  povprasevanjeId: string
  acceptedOfferId: string
}

export function MarkCompleteButton({ povprasevanjeId, acceptedOfferId }: MarkCompleteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleComplete() {
    if (!confirm('Ali ste prepričani, da je delo končano? S tem sprožite sprostitev plačila mojstru.')) return

    setLoading(true)
    setError(null)

    try {
      // Mark inquiry as complete
      const { error: err } = await supabase
        .from('povprasevanja')
        .update({ status: 'zakljuceno', updated_at: new Date().toISOString() })
        .eq('id', povprasevanjeId)

      if (err) throw err

      // Update accepted offer status to completed
      await supabase
        .from('ponudbe')
        .update({ status: 'zakljucena' })
        .eq('id', acceptedOfferId)

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Napaka pri zaključevanju.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <button
        onClick={handleComplete}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-slate-300 transition-colors"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Zaključujem...</>
        ) : (
          <><CheckCircle className="w-4 h-4" /> Potrdi zaključek dela</>
        )}
      </button>
    </div>
  )
}
