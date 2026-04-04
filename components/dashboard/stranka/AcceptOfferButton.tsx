'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  const supabase = createClient()

  async function handleAccept() {
    setLoading(true)
    setError(null)

    try {
      // 1. Get the offer details to find the craftsman
      const { data: offer } = await supabase
        .from('ponudbe')
        .select('obrtnik_id')
        .eq('id', offerId)
        .single()

      if (!offer) {
        setError('Ponudba ni najdena.')
        return
      }

      // 2. Accept this offer
      const { error: updateOfferError } = await supabase
        .from('ponudbe')
        .update({
          status: 'sprejeta',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', offerId)

      if (updateOfferError) throw updateOfferError

      // 3. Reject all other offers for this inquiry
      const { error: rejectError } = await supabase
        .from('ponudbe')
        .update({ status: 'zavrnjena' })
        .eq('povprasevanje_id', povprasevanjId)
        .neq('id', offerId)

      if (rejectError) throw rejectError

      // 4. Update inquiry status to 'v_teku'
      const { error: updateInquiryError } = await supabase
        .from('povprasevanja')
        .update({
          status: 'v_teku',
          obrtnik_id: offer.obrtnik_id,
        })
        .eq('id', povprasevanjId)

      if (updateInquiryError) throw updateInquiryError

      // 5. Create notification for the craftsman
      await supabase.from('notifications').insert({
        user_id: offer.obrtnik_id,
        type: 'ponudba_sprejeta',
        title: 'Vaša ponudba je bila sprejeta!',
        body: 'Naročnik je sprejel vašo ponudbo.',
        link: '/obrtnik-dashboard',
      })

      // Refresh page
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
