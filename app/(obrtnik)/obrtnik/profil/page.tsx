'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUploadZone } from '@/components/file-upload-zone'
import { uploadFile, generateFilePath } from '@/lib/storage'
import { AlertCircle, CheckCircle, LogOut } from 'lucide-react'

export default function ProfilPage() {
  const router = useRouter()
  const supabase = createClient()

  // Section 1: Personal
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)

  // Section 2: Business
  const [businessName, setBusinessName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [workingSince, setWorkingSince] = useState('')
  const [ajpesId, setAjpesId] = useState('')
  const [website, setWebsite] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [responseTime, setResponseTime] = useState('')
  const [savingBusiness, setSavingBusiness] = useState(false)

  // Section 3: Categories
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [savingCategories, setSavingCategories] = useState(false)

  // Section 4: Certificates
  const [certificateUrls, setCertificateUrls] = useState<string[]>([])
  const [savingCertificates, setSavingCertificates] = useState(false)

  // UI State
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [profileCompleness, setProfileCompleness] = useState(0)

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/partner-auth/login')
        return
      }

      // Load personal profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setFirstName(profile.first_name || '')
        setLastName(profile.last_name || '')
        setPhone(profile.phone || '')
        setLocationCity(profile.location_city || '')
        setAvatarUrl(profile.avatar_url || '')
      }

      // Load obrtnik profile
      const { data: obrtnikProfile } = await supabase
        .from('obrtnik_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (obrtnikProfile) {
        setBusinessName(obrtnikProfile.business_name || '')
        setTagline(obrtnikProfile.tagline || '')
        setDescription(obrtnikProfile.description || '')
        setHourlyRate(obrtnikProfile.hourly_rate || '')
        setYearsExperience(obrtnikProfile.years_experience || '')
        setWorkingSince(obrtnikProfile.working_since || '')
        setAjpesId(obrtnikProfile.ajpes_id || '')
        setWebsite(obrtnikProfile.website_url || '')
        setFacebook(obrtnikProfile.facebook_url || '')
        setInstagram(obrtnikProfile.instagram_url || '')
        setResponseTime(obrtnikProfile.response_time_hours || '')

        // Calculate profile completeness
        const filled = [
          tagline,
          description,
          hourlyRate,
          yearsExperience,
          ajpesId,
        ].filter(Boolean).length
        setProfileCompleness(Math.round((filled / 5) * 100))
      }

      // Load categories
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      setAllCategories(categories || [])

      // Load selected categories
      const { data: selected } = await supabase
        .from('obrtnik_categories')
        .select('category_id')
        .eq('obrtnik_id', user.id)

      setSelectedCategories(selected?.map(s => s.category_id) || [])

      setLoading(false)
    } catch (error) {
      console.error('[v0] Error loading profile:', error)
      setErrorMessage('Napaka pri nalaganju profila')
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Upload to Supabase Storage
      const filename = `${user.id}-${Date.now()}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename)

      setAvatarUrl(publicUrl)
      setAvatar(file)
    } catch (error) {
      console.error('[v0] Avatar upload error:', error)
      setErrorMessage('Napaka pri nalaganju slike')
    }
  }

  const savePersonalInfo = async () => {
    setSavingPersonal(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          location_city: locationCity,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (error) throw error

      setSuccessMessage('Osebni podatki shranjeni!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('[v0] Error saving personal info:', error)
      setErrorMessage('Napaka pri shranjevanju')
    } finally {
      setSavingPersonal(false)
    }
  }

  const saveBusinessInfo = async () => {
    setSavingBusiness(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('obrtnik_profiles')
        .update({
          business_name: businessName,
          tagline,
          description,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          working_since: workingSince || null,
          ajpes_id: ajpesId,
          website_url: website,
          facebook_url: facebook,
          instagram_url: instagram,
          response_time_hours: responseTime ? parseInt(responseTime) : null,
        })
        .eq('id', user.id)

      if (error) throw error

      // Recalculate completeness
      const filled = [tagline, description, hourlyRate, yearsExperience, ajpesId]
        .filter(Boolean).length
      setProfileCompleness(Math.round((filled / 5) * 100))

      setSuccessMessage('Podjetni podatki shranjeni!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('[v0] Error saving business info:', error)
      setErrorMessage('Napaka pri shranjevanju')
    } finally {
      setSavingBusiness(false)
    }
  }

  const toggleCategory = async (categoryId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const isSelected = selectedCategories.includes(categoryId)

      if (isSelected) {
        // Delete
        await supabase
          .from('obrtnik_categories')
          .delete()
          .eq('obrtnik_id', user.id)
          .eq('category_id', categoryId)

        setSelectedCategories(selectedCategories.filter(c => c !== categoryId))
      } else {
        // Check if already at max (5)
        if (selectedCategories.length >= 5) {
          setErrorMessage('Izbrali ste že maksimalno število kategorij (5)')
          return
        }

        // Insert
        await supabase
          .from('obrtnik_categories')
          .insert({ obrtnik_id: user.id, category_id: categoryId })

        setSelectedCategories([...selectedCategories, categoryId])
      }

      setSuccessMessage('Kategorije posodobljene!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('[v0] Error toggling category:', error)
      setErrorMessage('Napaka pri spremembi kategorij')
    }
  }

  const resetPassword = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { error } = await supabase.auth.resetPasswordForEmail(user.email)
      if (error) throw error

      setSuccessMessage(`Navodila za spremembo gesla so bila poslana na ${user.email}`)
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('[v0] Error resetting password:', error)
      setErrorMessage('Napaka pri pošiljanju navodil')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/partner-auth/login')
    } catch (error) {
      console.error('[v0] Logout error:', error)
      setErrorMessage('Napaka pri odjavi')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500">Nalagam profil...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Moj profil</h1>

      {/* Messages */}
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

      {/* Profile Completeness */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">Profil je {profileCompleness}% izpolnjen</h2>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-600 h-2 rounded-full transition-all"
            style={{ width: `${profileCompleness}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Dopolnite svoje podatke za boljšo vidnost pri strankah
        </p>
      </Card>

      {/* Section 1: Personal Info */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold">Osebni podatki</h2>

        {/* Avatar */}
        <div>
          <Label className="block mb-2">Profilna slika</Label>
          <div className="flex items-center gap-4">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Naloži sliko</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Ime</Label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Priimek</Label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            />
          </div>
          <div>
            <Label htmlFor="city">Mesto</Label>
            <input
              id="city"
              type="text"
              value={locationCity}
              onChange={e => setLocationCity(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            />
          </div>
        </div>

        <Button
          onClick={savePersonalInfo}
          disabled={savingPersonal}
          className="w-full"
        >
          {savingPersonal ? 'Shranjujem...' : 'Shrani osebne podatke'}
        </Button>
      </Card>

      {/* Section 2: Business Info */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold">Podjetje</h2>

        <div>
          <Label htmlFor="businessName">Naziv podjetja *</Label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
              required
            />
        </div>

        <div>
          <Label htmlFor="tagline">Tagline (max 100 znakov)</Label>
          <input
            id="tagline"
            type="text"
            maxLength={100}
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            placeholder="npr. Hitro, kvalitetno, zanesljivo"
          />
        </div>

        <div>
          <Label htmlFor="description">Opis ({description.length}/1000)</Label>
          <Textarea
            id="description"
            maxLength={1000}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="w-full mt-1 px-3 py-2 border rounded-lg"
            placeholder="Povejte kaj vas naredi posebnega..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="hourlyRate">Urna postavka (€)</Label>
            <input
              id="hourlyRate"
              type="number"
              step="0.01"
              value={hourlyRate}
              onChange={e => setHourlyRate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            />
          </div>
          <div>
            <Label htmlFor="yearsExp">Leta izkušenj</Label>
            <input
              id="yearsExp"
              type="number"
              value={yearsExperience}
              onChange={e => setYearsExperience(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            />
          </div>
          <div>
            <Label htmlFor="workingSince">Delam od:</Label>
            <input
              id="workingSince"
              type="year"
              value={workingSince}
              onChange={e => setWorkingSince(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
              placeholder="2010"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ajpes">AJPES ID</Label>
            <input
              id="ajpes"
              type="text"
              value={ajpesId}
              onChange={e => setAjpesId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            />
          </div>
          <div>
            <Label htmlFor="response">Čas odziva</Label>
            <select
              id="response"
              value={responseTime}
              onChange={e => setResponseTime(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
            >
              <option value="">Izberite...</option>
              <option value="1">Manj kot 1 uro</option>
              <option value="3">2-4 ure</option>
              <option value="24">1 dan</option>
              <option value="60">2-3 dni</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="website">Spletna stran</Label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="facebook">Facebook</Label>
            <input
              id="facebook"
              type="url"
              value={facebook}
              onChange={e => setFacebook(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <input
              id="instagram"
              type="url"
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg h-12 md:h-10 text-base md:text-sm"
              placeholder="https://instagram.com/..."
            />
          </div>
        </div>

        <Button
          onClick={saveBusinessInfo}
          disabled={savingBusiness}
          className="w-full"
        >
          {savingBusiness ? 'Shranjujem...' : 'Shrani podjetne podatke'}
        </Button>
      </Card>

      {/* Section 3: Categories */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold">Kategorije</h2>
        <p className="text-sm text-gray-600">
          Izberite do 5 kategorij, ki vas najbolje opisujejo
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`p-3 rounded-lg border-2 text-left transition ${
                selectedCategories.includes(cat.id)
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.icon_name}</span>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-gray-600">{selectedCategories.includes(cat.id) ? '✓ Izbrano' : ''}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedCategories.length > 0 && (
          <p className="text-sm text-gray-600">Izbrane kategorije: {selectedCategories.length}/5</p>
        )}
      </Card>

      {/* Section 4: Certificates and Documents */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold">Certifikati in reference</h2>
        <p className="text-sm text-gray-600">
          Naložite certifikate, licence in reference v PDF ali slikah
        </p>

        <FileUploadZone
          accept="image/*,application/pdf"
          maxFiles={10}
          maxSizeMB={5}
          label="Dodajte certifikate, licence ali reference"
          sublabel="PDF ali slike, max 5MB vsaka - do 10 datotek"
          onFilesChange={async (files) => {
            if (files.length > 0) {
              setSavingCertificates(true)
              try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const urls: string[] = []
                for (const file of files) {
                  const path = generateFilePath(user.id, file.name)
                  const { url, error } = await uploadFile('certificates', path, file)
                  if (url) {
                    urls.push(url)
                  } else {
                    console.error('[v0] Upload error:', error)
                  }
                }

                // Save certificate URLs to database
                const { error } = await supabase
                  .from('obrtnik_profiles')
                  .update({ certificate_urls: urls })
                  .eq('id', user.id)

                if (error) throw error

                setCertificateUrls(urls)
                setSuccessMessage('Certifikati uspešno naloženi!')
                setTimeout(() => setSuccessMessage(''), 3000)
              } catch (err) {
                console.error('[v0] Error saving certificates:', err)
                setErrorMessage('Napaka pri nalaganju certifikatov')
              } finally {
                setSavingCertificates(false)
              }
            }
          }}
        />

        {certificateUrls.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Naloženi certifikati:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {certificateUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 border rounded-lg text-sm text-blue-600 hover:bg-blue-50 flex items-center justify-between"
                >
                  <span className="truncate">Certifikat {idx + 1}</span>
                  <span className="text-xs">→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Section 5: Security */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold">Varnost</h2>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Spremenite geslo s klikom na gumb spodaj.
            </p>
            <Button
              onClick={resetPassword}
              variant="outline"
              className="w-full"
            >
              Spremenite geslo
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-2">
              Odjavite se s tega naprave.
            </p>
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full justify-start gap-2"
            >
              <LogOut className="w-4 h-4" />
              Odjava
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
