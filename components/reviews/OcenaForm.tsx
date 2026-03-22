'use client'

import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FileUploadZone } from '@/components/file-upload-zone'
import { uploadFile, generateFilePath } from '@/lib/storage'

interface OcenaFormProps {
  ponudba_id: string
  obrtnik_id: string
  obrtnik_name: string
  onSuccess: () => void
}

const RATING_LABELS = {
  quality: 'Kakovost dela',
  punctuality: 'Točnost prihoda',
  price: 'Vrednost za denar',
}

export function OcenaForm({
  ponudba_id,
  obrtnik_id,
  obrtnik_name,
  onSuccess,
}: OcenaFormProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [qualityRating, setQualityRating] = useState(0)
  const [punctualityRating, setPunctualityRating] = useState(0)
  const [priceRating, setPriceRating] = useState(0)
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxPhotos = 5
  const maxChars = 500

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    if (photos.length >= maxPhotos) {
      setError(`Največ ${maxPhotos} fotografij`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        setError('Samo slike so dovoljene')
        setUploading(false)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Slika je prevelika (max 5MB)')
        setUploading(false)
        return
      }

      const supabase = createClient()
      const fileName = `${ponudba_id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const { data, error: uploadError } = await supabase.storage
        .from('ocene')
        .upload(fileName, file)

      if (uploadError) {
        setError('Napaka pri nalaganju slike')
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from('ocene').getPublicUrl(fileName)
        setPhotos([...photos, publicUrl])
      }
    } catch (err) {
      setError('Napaka pri nalaganju')
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Izberite splošno oceno')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/prijava')
        return
      }

      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ponudba_id,
          obrtnik_id,
          rating,
          quality_rating: qualityRating || null,
          punctuality_rating: punctualityRating || null,
          price_rating: priceRating || null,
          comment: comment || null,
          photos: photos.length > 0 ? photos : null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Napaka pri shranjevanju ocene')
        return
      }

      onSuccess()
    } catch (err) {
      setError('Napaka pri oddaji ocene')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {/* General Rating */}
      <div>
        <label className="block text-sm font-semibold mb-3">Splošna ocena *</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition"
              type="button"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Sub-ratings */}
      <div className="space-y-4">
        {[
          { key: 'quality', state: qualityRating, setState: setQualityRating },
          { key: 'punctuality', state: punctualityRating, setState: setPunctualityRating },
          { key: 'price', state: priceRating, setState: setPriceRating },
        ].map(({ key, state, setState }) => (
          <div key={key}>
            <label className="text-sm text-gray-600">
              {RATING_LABELS[key as keyof typeof RATING_LABELS]}
            </label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setState(state === star ? 0 : star)}
                  type="button"
                  className="transition"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= state ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-semibold mb-2">Komentar (neobvezno)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, maxChars))}
          placeholder="Opišite vašo izkušnjo..."
          className="w-full h-24 p-3 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-xs text-gray-500 text-right mt-1">
          {comment.length}/{maxChars}
        </div>
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm font-semibold mb-2">Fotografije (do {maxPhotos})</label>
        <FileUploadZone
          accept="image/*"
          maxFiles={maxPhotos}
          maxSizeMB={5}
          label="Priložite fotografije zaključenega dela (neobvezno)"
          sublabel="Pokažite rezultat svojega dela"
          onFilesChange={async (files) => {
            if (files.length > 0 && photos.length < maxPhotos) {
              setUploading(true)
              setError(null)
              try {
                for (const file of files) {
                  const path = generateFilePath(ponudba_id, file.name)
                  const { url, error } = await uploadFile('ocene', path, file)
                  if (url) {
                    setPhotos((prev) => [...prev, url])
                  } else {
                    setError('Napaka pri nalaganju slike')
                  }
                }
              } finally {
                setUploading(false)
              }
            }
          }}
        />

        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative">
                <img src={photo} alt={`preview-${idx}`} className="w-full h-20 object-cover rounded" />
                <button
                  onClick={() => removePhoto(idx)}
                  type="button"
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {submitting ? 'Pošiljam...' : 'Oddaj oceno'}
      </button>
    </div>
  )
}
