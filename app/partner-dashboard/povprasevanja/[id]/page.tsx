'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, MapPin, Clock, Banknote, Tag } from 'lucide-react'
import Link from 'next/link'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'

interface Povprasevanje {
  id: string
  title: string
  description: string | null
  status: string
  location_city: string | null
  urgency: string | null
  budget_min: number | null
  budget_max: number | null
  created_at: string
  categories: { name: string; icon_name: string } | null
}

export default function PovprasevanjeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [povprasevanje, setPovprasevanje] = useState<Povprasevanje | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paket, setPaket] = useState<'start' | 'pro'>('start')

  const [message, setMessage] = useState('')
  const [priceEstimate, setPriceEstimate] = useState('')
  const [availableDate, setAvailableDate] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/partner-auth/login')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || profile.role !== 'obrtnik') {
        router.replace('/partner-auth/login')
        setLoading(false)
        return
      }

      const { data: partnerData } = await supabase
        .from('obrtnik_profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle()

      if (partnerData?.subscription_tier === 'pro') {
        setPaket('pro')
      }

      const { data, error } = await supabase
        .from('povprasevanja')
        .select(`
          id,
          title,
          description,
          status,
          location_city,
          urgency,
          budget_min,
          budget_max,
          created_at,
          categories:category_id(name, icon_name)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('[povprasevanje-detail] fetch error:', error.message)
        setError('Povpraševanje ni bilo najdeno.')
      } else {
        setPovprasevanje(data as Povprasevanje)
      }
      setLoading(false)
    }

    fetchData()
  }, [id, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('Sporočilo je obvezno.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/partner-auth/login')
      return
    }

    const { error: insertError } = await supabase
      .from('ponudbe')
      .insert({
        povprasevanje_id: id,
        obrtnik_id: user.id,
        message: message.trim(),
        price_estimate: priceEstimate ? parseFloat(priceEstimate) : null,
        price_type: 'fiksna',
        available_date: availableDate || null,
        status: 'poslana',
      })

    if (insertError) {
      console.error('[ponudba] insert error:', insertError.message)
      setError('Napaka pri pošiljanju ponudbe. Prosimo, poskusite znova.')
    } else {
      setSubmitted(true)
    }

    setSubmitting(false)
  }

  const timeAgo = (createdAt: string) => {
    const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    if (hoursAgo < 1) return 'pred manj kot uro'
    if (hoursAgo < 24) return `pred ${Math.floor(hoursAgo)}h`
    const daysAgo = Math.floor(hoursAgo / 24)
    return `pred ${daysAgo} ${daysAgo === 1 ? 'dnem' : 'dnevi'}`
  }

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `${min.toLocaleString('sl-SI')} – ${max.toLocaleString('sl-SI')} €`
    if (max) return `do ${max.toLocaleString('sl-SI')} €`
    if (min) return `od ${min.toLocaleString('sl-SI')} €`
    return null
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Nalagam...</p>
      </div>
    )
  }

  if (!povprasevanje) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Povpraševanje ni bilo najdeno.</p>
        <Link href="/partner-dashboard/povprasevanja">
          <Button variant="outline">Nazaj na seznam</Button>
        </Link>
      </div>
    )
  }

  const budget = formatBudget(povprasevanje.budget_min, povprasevanje.budget_max)
  const categoryName = (povprasevanje.categories as any)?.name ?? 'Splošno'

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
          {/* Back */}
          <Link href="/partner-dashboard/povprasevanja" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Nazaj na povpraševanja
          </Link>

          {/* Inquiry details */}
          <Card className="p-5 mb-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {categoryName}
                </span>
                {povprasevanje.urgency === 'nujno' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    Nujno
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-foreground">{povprasevanje.title}</h1>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {povprasevanje.location_city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{povprasevanje.location_city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{timeAgo(povprasevanje.created_at)}</span>
                </div>
              </div>

              {povprasevanje.description && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {povprasevanje.description}
                </p>
              )}

              {budget && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Banknote className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Budget: {budget}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Offer form */}
          {submitted ? (
            <Card className="p-8 text-center">
              <p className="text-lg font-semibold text-foreground mb-2">Ponudba uspešno poslana!</p>
              <p className="text-sm text-muted-foreground mb-6">
                Naročnik bo pregledal vašo ponudbo in vas kontaktiral.
              </p>
              <Link href="/partner-dashboard/povprasevanja">
                <Button variant="outline">Nazaj na seznam</Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">Pošlji ponudbo</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="message">Sporočilo naročniku *</Label>
                  <Textarea
                    id="message"
                    placeholder="Opišite svojo storitev, izkušnje in zakaj ste pravi izbor..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price">Okvirna cena (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="npr. 250"
                    value={priceEstimate}
                    onChange={(e) => setPriceEstimate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date">Razpoložljiv od</Label>
                  <Input
                    id="date"
                    type="date"
                    value={availableDate}
                    onChange={(e) => setAvailableDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px]"
                >
                  {submitting ? 'Pošiljam...' : 'Pošlji ponudbo'}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </main>
      <PartnerBottomNav paket={{ paket }} />
    </div>
  )
}
