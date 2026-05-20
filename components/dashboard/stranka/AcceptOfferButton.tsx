'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { acceptPonudbaAction } from '@/app/actions/ponudbe'

interface AcceptOfferButtonProps {
  offerId: string
  povprasevanjId: string
}

export function AcceptOfferButton({
  offerId,
  povprasevanjId,
}: AcceptOfferButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleAccept() {
    setLoading(true)
    setError(null)

    try {
      const result = await acceptPonudbaAction(offerId, povprasevanjId)
      if (!result.success) {
        setError(result.error || 'Napaka pri sprejemu ponudbe.')
        return
      }
      router.refresh()
    } catch (err: any) {
      console.error('[v0] Error accepting offer:', err)
      setError(err.message || 'Napaka pri sprejemu ponudbe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      <Button
        onClick={handleAccept}
        disabled={loading}
        className="bg-green-600 text-white hover:bg-green-700 font-medium px-6 py-2"
      >
        {loading ? 'Se sprejema...' : 'Sprejmi ponudbo'}
      </Button>
    </div>
  )
}
