'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FileUploadZone } from '@/components/file-upload-zone'
import { uploadFile, generateFilePath } from '@/lib/storage'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function AdminSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [heroUrl, setHeroUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('logo_url, hero_image_url, favicon_url')
        .eq('id', 1)
        .maybeSingle()

      if (data) {
        setLogoUrl(data.logo_url || '')
        setHeroUrl(data.hero_image_url || '')
        setFaviconUrl(data.favicon_url || '')
      }
    } catch (err) {
      console.error('[v0] Error loading settings:', err)
    }
  }

  const handleAssetUpload = async (
    assetType: 'logo' | 'hero' | 'favicon',
    files: File[]
  ) => {
    if (files.length === 0) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const file = files[0]
      const path = `platform/${assetType}/${generateFilePath('admin', file.name)}`
      const { url, error: uploadError } = await uploadFile('platform-assets', path, file)

      if (!url) {
        throw new Error(uploadError || 'Upload failed')
      }

      // Update database
      const updateData: any = {}
      if (assetType === 'logo') {
        updateData.logo_url = url
        setLogoUrl(url)
      } else if (assetType === 'hero') {
        updateData.hero_image_url = url
        setHeroUrl(url)
      } else if (assetType === 'favicon') {
        updateData.favicon_url = url
        setFaviconUrl(url)
      }

      const { error: updateError } = await supabase
        .from('platform_settings')
        .upsert([
          {
            id: 1,
            ...updateData,
            updated_at: new Date().toISOString(),
          },
        ])

      if (updateError) throw updateError

      setSuccess(`${assetType === 'logo' ? 'Logo' : assetType === 'hero' ? 'Hero slika' : 'Favicon'} uspešno naložen!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(`[v0] Error uploading ${assetType}:`, err)
      setError(`Napaka pri nalaganju: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nastavitve platforme</h1>
        <p className="text-muted-foreground mt-2">
          Upravljajte sredstva in konfiguracije platforme LiftGO
        </p>
      </div>

      {success && (
        <div className="flex gap-2 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex gap-2 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-bold">Sredstva platforme</h2>

        {/* Logo Upload */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Logo</Label>
          <p className="text-sm text-muted-foreground">
            Naložite logo platforme (JPG, PNG - max 2MB)
          </p>
          {logoUrl && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Logo je naložen</p>
                <p className="text-xs text-muted-foreground">{logoUrl}</p>
              </div>
            </div>
          )}
          <FileUploadZone
            accept="image/*"
            maxFiles={1}
            maxSizeMB={2}
            label="Kliknite ali povlecite logo"
            sublabel="Velikost max 2MB"
            onFilesChange={(files) => handleAssetUpload('logo', files)}
          />
        </div>

        {/* Hero Image Upload */}
        <div className="space-y-3 border-t pt-6">
          <Label className="text-base font-semibold">Hero slika</Label>
          <p className="text-sm text-muted-foreground">
            Naložite hero sliko za naslovnico (JPG, PNG - max 5MB)
          </p>
          {heroUrl && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <img src={heroUrl} alt="Hero" className="h-12 w-auto object-contain rounded" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Hero slika je naložena</p>
                <p className="text-xs text-muted-foreground">{heroUrl.substring(0, 50)}...</p>
              </div>
            </div>
          )}
          <FileUploadZone
            accept="image/*"
            maxFiles={1}
            maxSizeMB={5}
            label="Kliknite ali povlecite hero sliko"
            sublabel="Velikost max 5MB"
            onFilesChange={(files) => handleAssetUpload('hero', files)}
          />
        </div>

        {/* Favicon Upload */}
        <div className="space-y-3 border-t pt-6">
          <Label className="text-base font-semibold">Favicon</Label>
          <p className="text-sm text-muted-foreground">
            Naložite favicon (ICO, PNG - max 1MB)
          </p>
          {faviconUrl && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <img src={faviconUrl} alt="Favicon" className="h-6 w-6" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Favicon je naložen</p>
                <p className="text-xs text-muted-foreground">{faviconUrl}</p>
              </div>
            </div>
          )}
          <FileUploadZone
            accept="image/*"
            maxFiles={1}
            maxSizeMB={1}
            label="Kliknite ali povlecite favicon"
            sublabel="Velikost max 1MB"
            onFilesChange={(files) => handleAssetUpload('favicon', files)}
          />
        </div>
      </Card>
    </div>
  )
}
