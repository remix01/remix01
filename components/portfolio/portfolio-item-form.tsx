'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Upload, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortfolioItem {
  id: string
  title: string
  description: string | null
  category: string | null
  completed_at: string | null
  duration_days?: number | null
  price_approx?: number | null
  location_city?: string | null
  image_urls: string[] | null
  is_featured: boolean
}

interface PortfolioItemFormProps {
  item?: PortfolioItem
  obrtnikId: string
  onClose: () => void
  onSaved: () => void
  featuredCount?: number
}

export function PortfolioItemForm({
  item,
  obrtnikId,
  onClose,
  onSaved,
  featuredCount = 0,
}: PortfolioItemFormProps) {
  const [title, setTitle] = useState(item?.title || '')
  const [description, setDescription] = useState(item?.description || '')
  const [category, setCategory] = useState(item?.category || '')
  const [completedAt, setCompletedAt] = useState(item?.completed_at?.split('T')[0] || '')
  const [durationDays, setDurationDays] = useState(item?.duration_days?.toString() || '')
  const [priceApprox, setPriceApprox] = useState(item?.price_approx?.toString() || '')
  const [locationCity, setLocationCity] = useState(item?.location_city || '')
  const [isFeatured, setIsFeatured] = useState(item?.is_featured || false)
  const [imageUrls, setImageUrls] = useState<string[]>(item?.image_urls || [])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const canFeature = isFeatured || featuredCount < 3

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    if (imageUrls.length + files.length > 8) {
      setError('Največ 8 slik')
      return
    }

    setUploading(true)
    try {
      // Create FormData for API upload
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }
      formData.append('obrtnikId', obrtnikId)

      // Call API endpoint
      const res = await fetch('/api/portfolio/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Napaka pri nalaganju')
        setUploading(false)
        return
      }

      const { urls } = await res.json()
      setImageUrls([...imageUrls, ...urls])
      setError('')
      setUploadProgress(100)
    } catch (err: any) {
      setError(err.message || 'Napaka pri nalaganju')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Naslov je obvezna')
      return
    }

    setSaving(true)
    try {
      if (item) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('portfolio_items')
          .update({
            title,
            description,
            category,
            completed_at: completedAt,
            duration_days: durationDays ? parseInt(durationDays) : null,
            price_approx: priceApprox ? parseFloat(priceApprox) : null,
            location_city: locationCity,
            image_urls: imageUrls,
            is_featured: isFeatured,
          })
          .eq('id', item.id)

        if (updateError) throw updateError
      } else {
        // INSERT
        const { error: insertError } = await supabase.from('portfolio_items').insert({
          obrtnik_id: obrtnikId,
          title,
          description,
          category,
          completed_at: completedAt,
          duration_days: durationDays ? parseInt(durationDays) : null,
          price_approx: priceApprox ? parseFloat(priceApprox) : null,
          location_city: locationCity,
          image_urls: imageUrls,
          is_featured: isFeatured,
          sort_order: 999,
        })

        if (insertError) throw insertError
      }

      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item || !confirm('Ali ste prepričani?')) return

    setSaving(true)
    try {
      const { error: deleteError } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', item.id)

      if (deleteError) throw deleteError

      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-start md:justify-end">
      <div className="w-full md:w-[480px] bg-background h-screen md:h-auto md:max-h-screen overflow-y-auto shadow-xl rounded-t-lg md:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
          <h2 className="text-lg font-semibold text-foreground">{item ? 'Uredi projekt' : 'Dodaj projekt'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Naslov projekta *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="npr. Preurejanje kopalnice"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Kategorija</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Izberite...</option>
              <option value="hydraulics">Hidravlika</option>
              <option value="plumbing">Vodovodna dela</option>
              <option value="electrical">Elektrika</option>
              <option value="carpentry">Tesarstvo</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Opis</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Opišite projekt..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/500</p>
          </div>

          {/* Completed Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Datum zaključka</label>
            <input
              type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Duration & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Trajanje (dni)</label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="npr. 5"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Vrednost (€)</label>
              <input
                type="number"
                value={priceApprox}
                onChange={(e) => setPriceApprox(e.target.value)}
                placeholder="npr. 500"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Lokacija</label>
            <input
              type="text"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              placeholder="npr. Ljubljana"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Slike (max 8)</label>

            {/* Upload Zone */}
            <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Povlecite slike ali kliknite</p>
              <p className="text-xs text-muted-foreground">Max 5MB na sliko</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {uploading && (
              <div className="mt-2 p-2 bg-primary/10 rounded">
                <div className="h-2 bg-primary/20 rounded overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-primary mt-1">{uploadProgress}%</p>
              </div>
            )}

            {/* Previews */}
            {imageUrls.length > 0 && (
              <div className="mt-4 space-y-2">
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded border relative"
                  >
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 px-2 py-1 bg-amber-400 text-xs font-bold rounded">
                        Naslovna
                      </span>
                    )}
                    <img src={url} alt="" className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1 text-sm truncate">{url.split('/').pop()}</div>
                    <div className="flex gap-1">
                      {idx > 0 && (
                        <button
                          onClick={() => {
                            const newUrls = [...imageUrls]
                            ;[newUrls[idx], newUrls[idx - 1]] = [newUrls[idx - 1], newUrls[idx]]
                            setImageUrls(newUrls)
                          }}
                          className="p-1 hover:bg-white rounded"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      )}
                      {idx < imageUrls.length - 1 && (
                        <button
                          onClick={() => {
                            const newUrls = [...imageUrls]
                            ;[newUrls[idx], newUrls[idx + 1]] = [newUrls[idx + 1], newUrls[idx]]
                            setImageUrls(newUrls)
                          }}
                          className="p-1 hover:bg-white rounded"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-white rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <label className="text-sm font-medium text-foreground">Izpostavi projekt</label>
            <button
              onClick={() => setIsFeatured(!isFeatured)}
              disabled={!canFeature}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition',
                isFeatured ? 'bg-primary' : 'bg-muted-foreground/30',
                !canFeature && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-background transition',
                  isFeatured ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          {!canFeature && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
              Imate že 3 izpostavljene projekte. Odmaknite enega.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            {item && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
              >
                Izbriši
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-foreground border rounded-lg hover:bg-muted transition"
            >
              Prekliči
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Shranjevanje...' : item ? 'Posodobi' : 'Dodaj'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
