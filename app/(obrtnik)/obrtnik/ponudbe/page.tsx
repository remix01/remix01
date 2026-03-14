'use client'

import { useState } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Clock, AlertCircle, CheckCircle, ArchiveIcon } from 'lucide-react'
import { ObrtnikiOfferForm } from '@/components/obrtnik/offer-form'

export default function PonudbesPage() {
  const [activeTab, setActiveTab] = useState('nova')
  const [novaPovprasevanja, setNovaPovprasevanja] = useState<any[]>([])
  const [poslane, setPoslane] = useState<any[]>([])
  const [arhiv, setArhiv] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedForm, setExpandedForm] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/partner-auth/login')
      return
    }

    try {
      // Get obrtnik_id for current user
      const { data: obrtnikProfile } = await supabase
        .from('obrtnik_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!obrtnikProfile) {
        redirect('/partner-auth/login')
        return
      }

      // Get obrtnik's categories
      const { data: obrtnikCats } = await supabase
        .from('obrtnik_categories')
        .select('category_id')
        .eq('obrtnik_id', obrtnikProfile.id)

      const categoryIds = obrtnikCats?.map(oc => oc.category_id) || []

      // Get povprasevanja already sent by this obrtnik
      const { data: mojePonudbe } = await supabase
        .from('ponudbe')
        .select('povprasevanje_id')
        .eq('obrtnik_id', obrtnikProfile.id)

      const poslanoPovIds = mojePonudbe?.map(p => p.povprasevanje_id) || []

      // Tab 1: Nova povpraševanja - status='odprto', in obrtnik's categories, NOT already sent
      let query = supabase
        .from('povprasevanja')
        .select(`
          id, title, description, status, budget_min, budget_max,
          urgency, created_at, location_city,
          categories(name, icon_name)
        `)
        .eq('status', 'odprto')

      if (categoryIds.length > 0) {
        query = query.in('category_id', categoryIds)
      } else {
        // If obrtnik has no categories, show empty list
        query = query.in('category_id', [''])
      }

      if (poslanoPovIds.length > 0) {
        query = query.not('id', 'in', `(${poslanoPovIds.join(',')})`)
      }

      const { data: nP } = await query.order('urgency DESC, created_at DESC')

      // Tab 2: Poslane ponudbe
      const { data: pP } = await supabase
        .from('ponudbe')
        .select(`
          id, status, price_estimate, price_type, created_at,
          povprasevanja(id, title, category_id, location_city)
        `)
        .eq('obrtnik_id', obrtnikProfile.id)
        .in('status', ['poslana', 'sprejeta'])

      // Tab 3: Arhiv
      const { data: aP } = await supabase
        .from('ponudbe')
        .select(`
          id, status, price_estimate, created_at,
          povprasevanja(id, title)
        `)
        .eq('obrtnik_id', obrtnikProfile.id)
        .in('status', ['zavrnjena', 'preklicana'])

      setNovaPovprasevanja(nP || [])
      setPoslane(pP || [])
      setArhiv(aP || [])
    } catch (error) {
      console.error('[v0] Error loading ponudbe data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'nujno') return 'bg-red-100 text-red-800'
    if (urgency === 'kmalu') return 'bg-orange-100 text-orange-800'
    return 'bg-blue-100 text-blue-800'
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const minAgo = Math.floor((now.getTime() - created.getTime()) / 60000)
    if (minAgo < 60) return `pred ${minAgo} min`
    if (minAgo < 1440) return `pred ${Math.floor(minAgo / 60)} h`
    return `pred ${Math.floor(minAgo / 1440)} d`
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ponudbe</h1>
        <p className="text-gray-600 mb-6">Upravljajte z vašimi ponudbami in povpraševanji</p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="nova">Nova povpraševanja ({novaPovprasevanja.length})</TabsTrigger>
            <TabsTrigger value="poslane">Poslane ponudbe ({poslane.length})</TabsTrigger>
            <TabsTrigger value="arhiv">Arhiv ({arhiv.length})</TabsTrigger>
          </TabsList>

          {/* Tab: Nova povpraševanja */}
          <TabsContent value="nova" className="space-y-4 mt-6">
            {novaPovprasevanja.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-gray-500">Ni novih povpraševanj</p>
              </Card>
            ) : (
              novaPovprasevanja.map((pov) => (
                <Card key={pov.id} className="p-5 border">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{pov.categories?.name}</h3>
                          <Badge className={getUrgencyColor(pov.urgency)}>
                            {pov.urgency === 'nujno' ? '🔴 Nujno' : pov.urgency === 'kmalu' ? '🟠 Kmalu' : '🔵 Novo'}
                          </Badge>
                        </div>
                        <p className="font-medium text-gray-900">{pov.title}</p>
                      </div>
                    </div>

                    {/* Details */}
                    <p className="text-sm text-gray-600 line-clamp-2">{pov.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {pov.location_city}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        {getTimeAgo(pov.created_at)}
                      </div>
                      {pov.budget_min && (
                        <div className="font-medium">€{pov.budget_min} - €{pov.budget_max || '?'}</div>
                      )}
                    </div>

                    {/* Form Toggle */}
                    <Button
                      onClick={() => setExpandedForm(expandedForm === pov.id ? null : pov.id)}
                      className="w-full"
                    >
                      {expandedForm === pov.id ? 'Preklici' : 'Pošlji ponudbo'}
                    </Button>

                    {/* Inline Form */}
                    {expandedForm === pov.id && (
                      <ObrtnikiOfferForm 
                        povprasevanje_id={pov.id}
                        onSuccess={() => {
                          setExpandedForm(null)
                          loadData()
                        }}
                      />
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab: Poslane ponudbe */}
          <TabsContent value="poslane" className="space-y-4 mt-6">
            {poslane.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-gray-500">Ni poslanih ponudb</p>
              </Card>
            ) : (
              poslane.map((ponudba: any) => (
                <Card key={ponudba.id} className="p-5 border">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Link href={`/obrtnik/povprasevanja/${ponudba.povprasevanja.id}`}>
                        <p className="font-semibold hover:text-blue-600">{ponudba.povprasevanja.title}</p>
                      </Link>
                      <p className="text-sm text-gray-600">{ponudba.povprasevanja.location_city}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">€{ponudba.price_estimate}</p>
                      <p className="text-xs text-gray-600">{ponudba.price_type}</p>
                    </div>
                    <Badge variant={ponudba.status === 'sprejeta' ? 'default' : 'secondary'}>
                      {ponudba.status === 'sprejeta' ? '✓ Sprejeta' : 'Poslana'}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab: Arhiv */}
          <TabsContent value="arhiv" className="space-y-4 mt-6">
            {arhiv.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-gray-500">Arhiv je prazen</p>
              </Card>
            ) : (
              arhiv.map((ponudba: any) => (
                <Card key={ponudba.id} className="p-5 border opacity-75">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-600">{ponudba.povprasevanja.title}</p>
                    </div>
                    <Badge variant="outline">
                      {ponudba.status === 'zavrnjena' ? '✗ Zavrnjena' : 'Preklicana'}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
