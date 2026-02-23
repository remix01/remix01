'use client'

import { useState } from 'react'
import { Filter, MapPin, Euro, Clock, Check } from 'lucide-react'
import { MobileBottomSheet } from '@/components/liftgo/MobileBottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

interface PovprasevanjaListProps {
  povprasevanja: any[]
  categories: any[]
  obrtnikId: string
}

export function PovprasevanjaList({ povprasevanja, categories, obrtnikId }: PovprasevanjaListProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isPonudbaOpen, setIsPonudbaOpen] = useState(false)
  const [selectedPovprasevanje, setSelectedPovprasevanje] = useState<any>(null)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories.map(c => c.id))
  const [cityFilter, setCityFilter] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState<string[]>([])

  // Ponudba form state
  const [message, setMessage] = useState('')
  const [priceEstimate, setPriceEstimate] = useState('')
  const [priceType, setPriceType] = useState<'fiksna' | 'ocena' | 'po_ogledu'>('ocena')
  const [availableDate, setAvailableDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Apply filters
  const filteredPovprasevanja = povprasevanja.filter(p => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(p.category_id)) return false
    if (cityFilter && !p.location_city?.toLowerCase().includes(cityFilter.toLowerCase())) return false
    if (urgencyFilter.length > 0 && !urgencyFilter.includes(p.urgency)) return false
    return true
  })

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'nujno': return 'bg-red-100 text-red-700'
      case 'kmalu': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'nujno': return 'Nujno'
      case 'kmalu': return 'Kmalu'
      default: return 'Normalno'
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const createdDate = new Date(date)
    const diffMs = now.getTime() - createdDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'pravkar'
    if (diffMins < 60) return `${diffMins} min nazaj`
    if (diffHours < 24) return `${diffHours} ur nazaj`
    if (diffDays === 1) return 'včeraj'
    return `${diffDays} dni nazaj`
  }

  const handleOpenPonudba = (povprasevanje: any) => {
    setSelectedPovprasevanje(povprasevanje)
    setMessage('')
    setPriceEstimate('')
    setPriceType('ocena')
    setAvailableDate('')
    setIsPonudbaOpen(true)
  }

  const handleSubmitPonudba = async () => {
    if (!selectedPovprasevanje || !message || !priceEstimate) {
      toast.error('Prosim izpolnite vsa polja')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/ponudbe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          povprasevanje_id: selectedPovprasevanje.id,
          obrtnik_id: obrtnikId,
          message,
          price_estimate: parseFloat(priceEstimate),
          price_type: priceType,
          available_date: availableDate || null
        })
      })

      if (!response.ok) throw new Error('Failed to submit ponudba')

      setSubmittedIds(prev => new Set(prev).add(selectedPovprasevanje.id))
      toast.success('Ponudba uspešno poslana!')
      setIsPonudbaOpen(false)
      setSelectedPovprasevanje(null)
    } catch (error) {
      console.error('[v0] Error submitting ponudba:', error)
      toast.error('Napaka pri pošiljanju ponudbe')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Povpraševanja</h1>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Filter className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Cards List */}
      <div className="p-4 space-y-4">
        {filteredPovprasevanja.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">📋</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Ni odprtih povpraševanj
            </h2>
            <p className="text-gray-600 mb-4">
              Trenutno ni povpraševanj v vaših kategorijah
            </p>
            <Button onClick={() => window.location.reload()}>
              Osveži
            </Button>
          </Card>
        ) : (
          filteredPovprasevanja.map((p) => (
            <Card key={p.id} className="p-4 hover:shadow-lg transition-shadow">
              {/* Top Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getUrgencyColor(p.urgency)}>
                    {getUrgencyLabel(p.urgency)}
                  </Badge>
                  <span className="text-sm text-gray-600">{p.category?.name}</span>
                </div>
                <span className="text-xs text-gray-500">{getTimeAgo(p.created_at)}</span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                {p.title}
              </h3>

              {/* Location */}
              <div className="flex items-center gap-1 text-gray-700 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{p.location_city}</span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {p.description}
              </p>

              {/* Budget */}
              <div className="flex items-center gap-1 text-gray-900 mb-4">
                <Euro className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {p.budget_min && p.budget_max
                    ? `${p.budget_min}-${p.budget_max} EUR`
                    : 'Po dogovoru'}
                </span>
              </div>

              {/* Action Button */}
              {submittedIds.has(p.id) ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-lg font-medium">
                  <Check className="w-5 h-5" />
                  Ponudba poslana
                </div>
              ) : (
                <Button
                  onClick={() => handleOpenPonudba(p)}
                  className="w-full"
                  size="lg"
                >
                  Pošlji ponudbo →
                </Button>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Filter Sheet */}
      <MobileBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtri"
      >
        <div className="space-y-6">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorije
            </label>
            <div className="space-y-2">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories([...selectedCategories, cat.id])
                      } else {
                        setSelectedCategories(selectedCategories.filter(id => id !== cat.id))
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kraj
            </label>
            <Input
              placeholder="Vnesite kraj..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            />
          </div>

          {/* Urgency Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nujnost
            </label>
            <div className="space-y-2">
              {['normalno', 'kmalu', 'nujno'].map((urg) => (
                <label key={urg} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={urgencyFilter.includes(urg)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUrgencyFilter([...urgencyFilter, urg])
                      } else {
                        setUrgencyFilter(urgencyFilter.filter(u => u !== urg))
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{getUrgencyLabel(urg)}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={() => setIsFilterOpen(false)}
            className="w-full"
            size="lg"
          >
            Uporabi filtre
          </Button>
        </div>
      </MobileBottomSheet>

      {/* Ponudba Form Sheet */}
      <MobileBottomSheet
        isOpen={isPonudbaOpen}
        onClose={() => setIsPonudbaOpen(false)}
        title="Nova ponudba"
        snapPoints={[0.6, 0.95]}
      >
        {selectedPovprasevanje && (
          <div className="space-y-4">
            {/* Request Title (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Povpraševanje
              </label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                {selectedPovprasevanje.title}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sporočilo <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Opišite vašo ponudbo..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* Price Estimate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cena (EUR) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="0"
                value={priceEstimate}
                onChange={(e) => setPriceEstimate(e.target.value)}
                required
              />
            </div>

            {/* Price Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tip cene <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'fiksna', label: 'Fiksna' },
                  { value: 'ocena', label: 'Ocena' },
                  { value: 'po_ogledu', label: 'Po ogledu' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setPriceType(type.value as any)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      priceType === type.value
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kdaj ste na voljo?
              </label>
              <Input
                type="date"
                value={availableDate}
                onChange={(e) => setAvailableDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitPonudba}
              disabled={isSubmitting || !message || !priceEstimate}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Pošiljam...' : 'Pošlji ponudbo ✓'}
            </Button>
          </div>
        )}
      </MobileBottomSheet>
    </>
  )
}
