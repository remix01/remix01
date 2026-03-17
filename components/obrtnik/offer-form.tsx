'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { AgentDialog } from '@/components/agents/AgentDialog'

interface ObrtnikiOfferFormProps {
  povprasevanje_id: string
  onSuccess?: () => void
  /** Prefill message from AI quote generator */
  prefillMessage?: string
  /** Prefill price from AI quote generator */
  prefillPrice?: number
  /** Prefill price type from AI quote generator */
  prefillPriceType?: string
  /** Povpraševanje details for the offer writing agent */
  povprasevanjeContext?: {
    title?: string
    description?: string
    urgency?: string
    location_city?: string
    budget_min?: number
    budget_max?: number
    category?: string
  }
}

export function ObrtnikiOfferForm({ povprasevanje_id, onSuccess, prefillMessage, prefillPrice, prefillPriceType, povprasevanjeContext }: ObrtnikiOfferFormProps) {
  const [price, setPrice] = useState(prefillPrice != null ? String(prefillPrice) : '')
  const [priceType, setPriceType] = useState(prefillPriceType ?? 'fiksna')
  const [duration, setDuration] = useState('')
  const [availableDate, setAvailableDate] = useState('')
  const [message, setMessage] = useState(prefillMessage ?? '')

  useEffect(() => {
    if (prefillMessage) setMessage(prefillMessage)
  }, [prefillMessage])

  useEffect(() => {
    if (prefillPrice != null) setPrice(String(prefillPrice))
  }, [prefillPrice])

  useEffect(() => {
    if (prefillPriceType) setPriceType(prefillPriceType)
  }, [prefillPriceType])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const charCount = message.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validacije
    if (!price || !duration || !availableDate || message.length < 30) {
      setError('Izpolnite vse polje. Sporočilo mora imeti najmanj 30 znakov.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niste prijavljeni')

      const { data: obrtnik } = await supabase
        .from('obrtnik_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!obrtnik) throw new Error('Profil ni najden')

      // INSERT ponudba
      const { error: insertError } = await supabase
        .from('ponudbe')
        .insert({
          povprasevanje_id,
          obrtnik_id: obrtnik.id,
          price_estimate: parseFloat(price),
          price_type: priceType,
          estimated_duration: duration,
          available_date: availableDate,
          message,
          status: 'poslana',
        })

      if (insertError) throw insertError

      // Fetch obrtnik business name for notification
      const { data: obrtnikProfile } = await supabase
        .from('obrtnik_profiles')
        .select('business_name')
        .eq('id', obrtnik.id)
        .maybeSingle()

      const businessName = obrtnikProfile?.business_name || 'Obrtnik'

      // INSERT notifikacija s prikazu imena mojstra
      const { data: povprasevanje } = await supabase
        .from('povprasevanja')
        .select('narocnik_id')
        .eq('id', povprasevanje_id)
        .maybeSingle()

      if (povprasevanje) {
        await supabase
          .from('notifications')
          .insert({
            user_id: povprasevanje.narocnik_id,
            type: 'nova_ponudba',
            title: 'Prejeli ste novo ponudbo! 🎉',
            message: `${businessName} je poslal ponudbo za vaše povpraševanje.`,
            read: false,
          })
      }

      setSuccess(true)
      setPrice('')
      setMessage('')
      setDuration('')
      setAvailableDate('')
      setTimeout(() => onSuccess?.(), 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 text-red-800 rounded border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex gap-2 p-3 bg-green-50 text-green-800 rounded border border-green-200">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">Ponudba je bila poslana!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Price */}
        <div>
          <label className="block text-sm font-medium mb-1">Cena (€)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="npr. 150"
            required
          />
        </div>

        {/* Price Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Vrsta cene</label>
          <select
            value={priceType}
            onChange={e => setPriceType(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fiksna">Fiksna cena</option>
            <option value="ocena">Ocena</option>
            <option value="po-ogledu">Po ogledu</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-1">Predvideni čas</label>
          <input
            type="text"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="npr. 1-2 dni"
            required
          />
        </div>

        {/* Available Date */}
        <div>
          <label className="block text-sm font-medium mb-1">Dostopnost</label>
          <input
            type="date"
            value={availableDate}
            onChange={e => setAvailableDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Sporočilo ({charCount}/30)</label>
          <AgentDialog
            agentType="offer_writing"
            context={povprasevanjeContext ?? {}}
            triggerLabel="AI pomoč pri pisanju"
            triggerClassName="text-xs text-teal-600 border-teal-200 hover:bg-teal-50"
            initialMessage="Pomagaj mi napisati profesionalno ponudbo za to povpraševanje."
          />
        </div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Napišite svoje sporočilo..."
          minLength={30}
          required
        />
        <p className="text-xs text-gray-500 mt-1">Najmanj 30 znakov</p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading || charCount < 30}
        className="w-full"
      >
        {loading ? 'Pošiljam...' : 'Pošlji ponudbo'}
      </Button>
    </form>
  )
}
