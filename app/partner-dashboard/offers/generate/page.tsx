'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Send, Edit2, Check, Camera } from 'lucide-react'
import { TierGate } from '@/components/partner/tier-gate'

const CATEGORIES = [
  'Gradnja & adaptacije',
  'Vodovod & ogrevanje',
  'Elektrika & pametni sistemi',
  'Mizarstvo & kovinarstvo',
  'Zaključna dela',
  'Okna, vrata & senčila',
  'Okolica & zunanja ureditev',
  'Vzdrževanje & popravila',
  'Poslovne storitve',
]

interface GeneratedOffer {
  offerText: string
  serviceType: string
  location: string
  estimatedHours: number
  hourlyRate: number
  materialsEstimate: number
}

export default function OfferGeneratorPage() {
  const router = useRouter()
  const supabase = createClient()
  const [partner, setPartner] = useState<any>(null)
  const [paket, setPaket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedOffer, setGeneratedOffer] = useState<GeneratedOffer | null>(null)
  const [editingOffer, setEditingOffer] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [inquiries, setInquiries] = useState<any[]>([])
  const [mediaAnalysis, setMediaAnalysis] = useState('')
  const [mediaLoading, setMediaLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    serviceType: '',
    location: '',
    description: '',
    estimatedHours: '',
    hourlyRate: '',
    materialsEstimate: '',
    selectedInquiry: '',
    mediaUrl: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/partner-auth/login')
          return
        }

        const { data: partnerData } = await supabase
          .from('obrtnik_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!partnerData) {
          router.push('/partner-auth/login')
          return
        }

        setPartner(partnerData)
        setFormData(prev => ({ ...prev, hourlyRate: partnerData.hourly_rate?.toString() || '' }))

        const paketData = { paket: partnerData.subscription_tier || 'start' }
        setPaket(paketData)

        if (paketData.paket === 'pro' || paketData.paket === 'elite') {
          // Load open inquiries for quick sending
          const { data: inquiriesData } = await supabase
            .from('povprasevanja')
            .select('id, title')
            .eq('status', 'odprto')
            .order('created_at', { ascending: false })
            .limit(20)

          if (inquiriesData) {
            setInquiries(inquiriesData)
          }
        }
      } catch (error) {
        console.error('[v0] Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.serviceType) newErrors.serviceType = 'Izberite vrsto storitve'
    if (!formData.location.trim()) newErrors.location = 'Vnesite lokacijo'
    if (formData.description.trim().length < 50) newErrors.description = 'Opis mora imeti najmanj 50 znakov'
    const estimatedHours = parseFloat(formData.estimatedHours)
    const hourlyRate = parseFloat(formData.hourlyRate)
    const materials = formData.materialsEstimate ? parseFloat(formData.materialsEstimate) : 0
    if (!formData.estimatedHours || Number.isNaN(estimatedHours) || estimatedHours <= 0) {
      newErrors.estimatedHours = 'Vnesite veljavne ocenjene ure'
    }
    if (!formData.hourlyRate || Number.isNaN(hourlyRate) || hourlyRate <= 0) {
      newErrors.hourlyRate = 'Vnesite veljavno urno postavko'
    }
    if (formData.materialsEstimate && (Number.isNaN(materials) || materials < 0)) {
      newErrors.materialsEstimate = 'Ocena materialov ne more biti negativna'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleGenerateOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setGenerating(true)
    try {
      const response = await fetch('/api/partner/generate-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: formData.serviceType,
          location: formData.location,
          description: formData.description,
          estimatedHours: parseFloat(formData.estimatedHours),
          hourlyRate: parseFloat(formData.hourlyRate),
          materialsEstimate: formData.materialsEstimate ? parseFloat(formData.materialsEstimate) : 0,
          partnerName: partner?.business_name || 'Partner',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Napaka pri generiranju ponudbe')
      }

      const data = await response.json()
      setGeneratedOffer({
        offerText: data.data.offerText,
        serviceType: formData.serviceType,
        location: formData.location,
        estimatedHours: parseFloat(formData.estimatedHours),
        hourlyRate: parseFloat(formData.hourlyRate),
        materialsEstimate: formData.materialsEstimate ? parseFloat(formData.materialsEstimate) : 0,
      })
      setEditingOffer(false)
    } catch (error) {
      console.error('[v0] Error generating offer:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Napaka pri generiranju' })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyToClipboard = async () => {
    if (!generatedOffer) return
    try {
      await navigator.clipboard.writeText(generatedOffer.offerText)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('[v0] Copy error:', error)
    }
  }

  const handleSendToCustomer = async () => {
    if (!generatedOffer || !formData.selectedInquiry) return
    if (!partner?.id) return

    setSendLoading(true)
    setErrors((prev) => ({ ...prev, send: '' }))
    setSendSuccess(null)
    try {
      const totalPrice = (generatedOffer.estimatedHours * generatedOffer.hourlyRate) + generatedOffer.materialsEstimate
      const { error } = await supabase.from('ponudbe').insert({
        povprasevanje_id: formData.selectedInquiry,
        obrtnik_id: partner.id,
        message: generatedOffer.offerText,
        price_estimate: totalPrice,
        price_type: 'ocena',
        status: 'poslana',
      })

      if (error) throw error

      setSendSuccess('Ponudba je bila uspešno poslana stranki.')
      setFormData((prev) => ({ ...prev, selectedInquiry: '' }))
    } catch (error) {
      console.error('[v0] Error sending offer:', error)
      setErrors((prev) => ({
        ...prev,
        send: error instanceof Error ? error.message : 'Napaka pri pošiljanju ponudbe',
      }))
    } finally {
      setSendLoading(false)
    }
  }

  const handleAnalyzeMedia = async () => {
    if (!formData.mediaUrl) return
    setMediaLoading(true)
    try {
      const res = await fetch('/api/ai/analyze-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: formData.mediaUrl,
          description: formData.description,
        }),
      })
      const payload = await res.json()
      if (payload.success) {
        setMediaAnalysis(payload.data)
        setFormData((prev) => ({
          ...prev,
          description: `${prev.description}\\n\\n[AI ANALIZA SLIKE]\\n${payload.data}`.trim(),
        }))
      }
    } finally {
      setMediaLoading(false)
    }
  }

  const handleMediaFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Branje datoteke ni uspelo.'))
      reader.readAsDataURL(file)
    })

    setFormData((prev) => ({ ...prev, mediaUrl: fileUrl }))
    event.target.value = ''
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Nalagam...</p>
        </div>
      </div>
    )
  }

  if (paket?.paket !== 'pro' && paket?.paket !== 'elite') {
    return (
      <TierGate
        requiredTier="pro"
        description="Generator ponudb je dostopen samo za PRO obrtnike. Vključuje: Generator ponudb, Materiali in zaloge, Video diagnoza, Povzetek dela – 100 AI sporočil/dan."
      />
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Generator Ponudb</h1>
            <p className="text-muted-foreground">
              Ustvarite profesionalne ponudbe z AI
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Form */}
            <div>
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-6">Nova ponudba</h2>
                <form onSubmit={handleGenerateOffer} className="space-y-4">
                  <div>
                    <Label htmlFor="serviceType">Vrsta storitve *</Label>
                    <Select 
                      value={formData.serviceType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
                    >
                      <SelectTrigger className={errors.serviceType ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Izberite kategorijo" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.serviceType && <p className="text-red-500 text-sm mt-1">{errors.serviceType}</p>}
                  </div>

                  <div>
                    <Label htmlFor="location">Lokacija *</Label>
                    <Input
                      id="location"
                      placeholder="npr. Ljubljana"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className={errors.location ? 'border-red-500' : ''}
                    />
                    {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                  </div>

                  <div>
                    <Label htmlFor="description">Opis dela *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detaljno opišite delo in zahteve..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className={errors.description ? 'border-red-500' : ''}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.description.length}/50 znakov
                    </p>
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="estimatedHours">Ocenjene ure *</Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="8"
                      value={formData.estimatedHours}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                        className={errors.estimatedHours ? 'border-red-500' : ''}
                      />
                      {errors.estimatedHours && <p className="text-red-500 text-sm mt-1">{errors.estimatedHours}</p>}
                    </div>

                    <div>
                      <Label htmlFor="hourlyRate">Urna postavka (EUR) *</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="50"
                      value={formData.hourlyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                        className={errors.hourlyRate ? 'border-red-500' : ''}
                      />
                      {errors.hourlyRate && <p className="text-red-500 text-sm mt-1">{errors.hourlyRate}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="materialsEstimate">Ocena materialov (EUR)</Label>
                    <Input
                      id="materialsEstimate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={formData.materialsEstimate}
                      onChange={(e) => setFormData(prev => ({ ...prev, materialsEstimate: e.target.value }))}
                    />
                    {errors.materialsEstimate && <p className="text-red-500 text-sm mt-1">{errors.materialsEstimate}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mediaUrl">URL slike/videa (PRO/ELITE)</Label>
                    <Input
                      id="mediaUrl"
                      placeholder="https://..."
                      value={formData.mediaUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                    />
                    <label className="inline-flex">
                      <Input
                        type="file"
                        accept="image/*,video/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleMediaFileSelect}
                      />
                      <span className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                        <Camera className="mr-2 h-4 w-4" />
                        Kamera / datoteka
                      </span>
                    </label>
                    <Button type="button" variant="outline" onClick={handleAnalyzeMedia} disabled={mediaLoading || !formData.mediaUrl}>
                      {mediaLoading ? 'Analiziram slike...' : 'Analiziraj slike z AI'}
                    </Button>
                    {mediaAnalysis && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{mediaAnalysis}</p>}
                  </div>

                  {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}

                  <Button 
                    type="submit" 
                    disabled={generating}
                    className="w-full"
                  >
                    {generating ? 'Generiram ponudbo...' : 'Generiraj ponudbo'}
                  </Button>
                </form>
              </Card>
            </div>

            {/* Preview */}
            {generatedOffer && (
              <div>
                <Card className="p-6 bg-gray-50 border border-gray-200">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-bold">Predogled ponudbe</h2>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingOffer(!editingOffer)}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Uredi
                      </Button>
                    </div>
                  </div>

                  {editingOffer ? (
                    <div className="space-y-4">
                      <Textarea
                        value={generatedOffer.offerText}
                        onChange={(e) => setGeneratedOffer(prev => prev ? { ...prev, offerText: e.target.value } : null)}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => setEditingOffer(false)}
                        className="w-full gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Shrani
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-6 rounded border border-gray-200 mb-4 max-h-96 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                        {generatedOffer.offerText}
                      </div>

                      <div className="space-y-3">
                        <Button
                          onClick={handleCopyToClipboard}
                          variant="outline"
                          className="w-full gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          {copySuccess ? 'Kopirano!' : 'Kopiraj v odložišče'}
                        </Button>

                        {inquiries.length > 0 && (
                          <div className="space-y-2">
                            <Label htmlFor="selectedInquiry">Pošlji stranki</Label>
                            <Select
                              value={formData.selectedInquiry}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, selectedInquiry: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Izberite povpraševanje" />
                              </SelectTrigger>
                              <SelectContent>
                                {inquiries.map(inq => (
                                  <SelectItem key={inq.id} value={inq.id}>
                                    {inq.title || `Povpraševanje #${inq.id}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleSendToCustomer}
                              disabled={!formData.selectedInquiry || sendLoading}
                              className="w-full gap-2"
                            >
                              <Send className="h-4 w-4" />
                              {sendLoading ? 'Pošiljam...' : 'Pošlji stranki'}
                            </Button>
                            {errors.send && <p className="text-sm text-red-500">{errors.send}</p>}
                            {sendSuccess && <p className="text-sm text-green-600">{sendSuccess}</p>}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}
          </div>
    </div>
  )
}
