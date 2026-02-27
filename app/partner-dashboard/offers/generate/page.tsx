'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PartnerSidebar } from '@/components/partner/sidebar'
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
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Copy, Send, Edit2, Check } from 'lucide-react'
import Link from 'next/link'

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

  const [formData, setFormData] = useState({
    serviceType: '',
    location: '',
    description: '',
    estimatedHours: '',
    hourlyRate: '',
    materialsEstimate: '',
    selectedInquiry: '',
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
          .from('partners')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!partnerData) {
          router.push('/partner-auth/login')
          return
        }

        setPartner(partnerData)
        setFormData(prev => ({ ...prev, hourlyRate: partnerData.hourly_rate || '' }))

        const { data: paketData } = await supabase
          .from('partner_paketi')
          .select('*')
          .eq('obrtnik_id', partnerData.id)
          .single()

        if (paketData) {
          setPaket(paketData)

          if (paketData.paket === 'pro') {
            // Load inquiries
            const { data: inquiriesData } = await supabase
              .from('povprasevanja')
              .select('*')
              .eq('partner_id', partnerData.id)
              .order('created_at', { ascending: false })

            if (inquiriesData) {
              setInquiries(inquiriesData)
            }
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
    if (formData.description.length < 50) newErrors.description = 'Opis mora imeti najmanj 50 znakov'
    if (!formData.estimatedHours) newErrors.estimatedHours = 'Vnesite ocenjene ure'
    if (!formData.hourlyRate) newErrors.hourlyRate = 'Vnesite urno postavko'

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
          partnerName: partner?.company_name || 'Partner',
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
    // TODO: Send offer to selected inquiry
    alert('Ponudba bo poslana stranki')
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

  // Show upgrade prompt if not PRO
  if (paket?.paket !== 'pro') {
    return (
      <div className="flex h-screen bg-background">
        <PartnerSidebar partner={partner} />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md p-8 text-center border-amber-200 bg-amber-50">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">PRO Paket Obvezen</h2>
            <p className="text-muted-foreground mb-6">
              Generator ponudb je dostopen samo za PRO partnernike.
            </p>
            <Button asChild className="w-full">
              <Link href="/cenik">Nadgradi v PRO</Link>
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <PartnerSidebar partner={partner} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimatedHours">Ocenjene ure *</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        step="0.5"
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
                      placeholder="0"
                      value={formData.materialsEstimate}
                      onChange={(e) => setFormData(prev => ({ ...prev, materialsEstimate: e.target.value }))}
                    />
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
                  <div className="flex items-center justify-between mb-4">
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
                                    {inq.customer_name} - {inq.service_type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleSendToCustomer}
                              disabled={!formData.selectedInquiry}
                              className="w-full gap-2"
                            >
                              <Send className="h-4 w-4" />
                              Pošlji stranki
                            </Button>
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
      </main>
    </div>
  )
}
