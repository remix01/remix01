'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { uploadFile, generateFilePath } from '@/lib/storage'

interface AssetUploadProps {
  label: string
  sublabel: string
  accept: string
  maxSizeMB: number
  currentUrl?: string
  onUploaded: (url: string) => void
}

function AssetUpload({ label, sublabel, accept, maxSizeMB, currentUrl, onUploaded }: AssetUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Datoteka je prevelika (max ${maxSizeMB}MB)`)
      return
    }

    setUploading(true)
    setError(null)
    try {
      const path = generateFilePath('platform', file.name)
      const { url, error: uploadError } = await uploadFile('platform-assets', path, file)
      if (uploadError) {
        setError(uploadError)
      } else if (url) {
        onUploaded(url)
      }
    } catch {
      setError('Napaka pri nalaganju')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-gray-500">{sublabel}</p>
      {currentUrl && (
        <div className="mb-2">
          <img src={currentUrl} alt={label} className="h-16 object-contain rounded border bg-gray-50 p-1" />
        </div>
      )}
      <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 w-fit">
        <span className="text-sm">{uploading ? 'Nalagam...' : 'Izberi datoteko'}</span>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function AdminNastavitve() {
  const supabase = createClient()

  const [logoUrl, setLogoUrl] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('logo_url, hero_image_url, favicon_url')
        .eq('id', 1)
        .maybeSingle()

      if (data) {
        setLogoUrl(data.logo_url || '')
        setHeroImageUrl(data.hero_image_url || '')
        setFaviconUrl(data.favicon_url || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    setErrorMessage('')
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          id: 1,
          logo_url: logoUrl || null,
          hero_image_url: heroImageUrl || null,
          favicon_url: faviconUrl || null,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setSuccessMessage('Nastavitve shranjene!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('[admin] Error saving platform settings:', err)
      setErrorMessage('Napaka pri shranjevanju nastavitev')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500">Nalagam nastavitve...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Nastavitve platforme</h1>

      {successMessage && (
        <div className="flex gap-2 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="flex gap-2 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-bold">Vizualna identiteta</h2>

        <AssetUpload
          label="Logotip"
          sublabel="JPG ali PNG, max 2MB. Priporočena velikost: 200×60px"
          accept="image/jpeg,image/png"
          maxSizeMB={2}
          currentUrl={logoUrl}
          onUploaded={setLogoUrl}
        />

        <div className="border-t pt-4">
          <AssetUpload
            label="Hero slika (naslovna stran)"
            sublabel="JPG ali PNG, max 5MB. Priporočena velikost: 1920×1080px"
            accept="image/jpeg,image/png"
            maxSizeMB={5}
            currentUrl={heroImageUrl}
            onUploaded={setHeroImageUrl}
          />
        </div>

        <div className="border-t pt-4">
          <AssetUpload
            label="Favicon"
            sublabel="ICO ali PNG, max 1MB. Priporočena velikost: 32×32px"
            accept="image/x-icon,image/png"
            maxSizeMB={1}
            currentUrl={faviconUrl}
            onUploaded={setFaviconUrl}
          />
        </div>

        <Button
          onClick={saveSettings}
          disabled={saving}
          className="w-full mt-4"
        >
          {saving ? 'Shranjujem...' : 'Shrani nastavitve'}
        </Button>
      </Card>
    </div>
  )
}
