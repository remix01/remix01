'use client'

import { useState, useEffect } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Clock, AlertCircle, Edit2, Trash2, RefreshCw } from 'lucide-react'
import { ObrtnikiOfferForm } from '@/components/obrtnik/offer-form'
import { updatePonudbaAction, withdrawPonudbaAction } from '@/app/actions/ponudbe'

const PAGE_SIZE = 20

export default function PonudbesPage() {
  const [activeTab, setActiveTab] = useState('nova')
  const [novaPovprasevanja, setNovaPovprasevanja] = useState<any[]>([])
  const [poslane, setPoslane] = useState<any[]>([])
  const [arhiv, setArhiv] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedForm, setExpandedForm] = useState<string | null>(null)

  // Pagination
  const [novaHasMore, setNovaHasMore] = useState(false)
  const [poslaneHasMore, setPoslaneHasMore] = useState(false)
  const [arhivHasMore, setArhivHasMore] = useState(false)
  const [novaPage, setNovaPage] = useState(0)
  const [poslanePage, setPoslanePage] = useState(0)
  const [arhivPage, setArhivPage] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ message: '', price_estimate: '', available_date: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/partner-auth/login')
      return
    }

    try {
      const { data: obrtnikProfile } = await supabase
        .from('obrtnik_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!obrtnikProfile) {
        redirect('/partner-auth/login')
        return
      }

      const { data: obrtnikCats } = await supabase
        .from('obrtnik_categories')
        .select('category_id')
        .eq('obrtnik_id', obrtnikProfile.id)

      const categoryIds = obrtnikCats?.map((oc: { category_id: string }) => oc.category_id) || []

      const { data: mojePonudbe } = await supabase
        .from('ponudbe')
        .select('povprasevanje_id')
        .eq('obrtnik_id', obrtnikProfile.id)

      const poslanoPovIds = mojePonudbe?.map((p: { povprasevanje_id: string }) => p.povprasevanje_id) || []

      // Tab 1: Nova povpraševanja
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
        query = query.in('category_id', [''])
      }

      if (poslanoPovIds.length > 0) {
        query = query.not('id', 'in', `(${poslanoPovIds.join(',')})`)
      }

      const { data: nP, error: nErr } = await query
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE)

      if (nErr) console.error('[v0] Nova query error:', nErr)

      // Tab 2: Poslane ponudbe
      const { data: pP, error: pErr } = await supabase
        .from('ponudbe')
        .select(`
          id, status, price_estimate, price_type, message, available_date, created_at,
          povprasevanja(id, title, category_id, location_city)
        `)
        .eq('obrtnik_id', obrtnikProfile.id)
        .in('status', ['poslana', 'sprejeta'])
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE)

      if (pErr) console.error('[v0] Poslane query error:', pErr)

      // Tab 3: Arhiv (includes location_city)
      const { data: aP, error: aErr } = await supabase
        .from('ponudbe')
        .select(`
          id, status, price_estimate, created_at,
          povprasevanja(id, title, location_city)
        `)
        .eq('obrtnik_id', obrtnikProfile.id)
        .in('status', ['zavrnjena', 'preklicana'])
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE)

      if (aErr) console.error('[v0] Arhiv query error:', aErr)

      const nArr = nP || []
      const pArr = pP || []
      const aArr = aP || []
      setNovaHasMore(nArr.length > PAGE_SIZE)
      setPoslaneHasMore(pArr.length > PAGE_SIZE)
      setArhivHasMore(aArr.length > PAGE_SIZE)
      setNovaPovprasevanja(nArr.slice(0, PAGE_SIZE))
      setPoslane(pArr.slice(0, PAGE_SIZE))
      setArhiv(aArr.slice(0, PAGE_SIZE))
      setNovaPage(0)
      setPoslanePage(0)
      setArhivPage(0)
    } catch (error) {
      console.error('[v0] Error loading ponudbe data:', error)
      setLoadError('Napaka pri nalaganju podatkov. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreNova = async () => {
    setLoadingMore(true)
    try {
      const nextPage = novaPage + 1
      const from = nextPage * PAGE_SIZE
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: obrtnikProfile } = await supabase
        .from('obrtnik_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      if (!obrtnikProfile) return

      const { data: obrtnikCats } = await supabase
        .from('obrtnik_categories')
        .select('category_id')
        .eq('obrtnik_id', obrtnikProfile.id)
      const categoryIds = obrtnikCats?.map((oc: { category_id: string }) => oc.category_id) || []

      const { data: mojePonudbe } = await supabase
        .from('ponudbe')
        .select('povprasevanje_id')
        .eq('obrtnik_id', obrtnikProfile.id)
      const poslanoPovIds = mojePonudbe?.map((p: { povprasevanje_id: string }) => p.povprasevanje_id) || []

      let query = supabase
        .from('povprasevanja')
        .select(`id, title, description, status, budget_min, budget_max, urgency, created_at, location_city, categories(name, icon_name)`)
        .eq('status', 'odprto')

      if (categoryIds.length > 0) query = query.in('category_id', categoryIds)
      else query = query.in('category_id', [''])
      if (poslanoPovIds.length > 0) query = query.not('id', 'in', `(${poslanoPovIds.join(',')})`)

      const { data } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE)
      if (data) {
        const hasMore = data.length > PAGE_SIZE
        setNovaPovprasevanja(prev => [...prev, ...data.slice(0, PAGE_SIZE)])
        setNovaHasMore(hasMore)
        setNovaPage(nextPage)
      }
    } finally {
      setLoadingMore(false)
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

  const startEditing = (ponudba: any) => {
    setEditError(null)
    setEditingId(ponudba.id)
    setEditForm({
      message: ponudba.message || '',
      price_estimate: ponudba.price_estimate ? String(ponudba.price_estimate) : '',
      available_date: ponudba.available_date ? String(ponudba.available_date).slice(0, 10) : '',
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditError(null)
  }

  const handleEditSave = async (ponudbaId: string) => {
    setEditError(null)
    const parsedPrice = Number(editForm.price_estimate)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setEditError('Cena mora biti večja od 0.')
      return
    }
    setEditSaving(true)
    try {
      const result = await updatePonudbaAction(ponudbaId, {
        message: editForm.message.trim(),
        price_estimate: parsedPrice,
        available_date: editForm.available_date || null,
      })
      if (!result.success) {
        setEditError(result.error || 'Napaka pri urejanju ponudbe.')
        return
      }
      cancelEditing()
      loadData()
    } catch {
      setEditError('Napaka pri urejanju ponudbe.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleWithdraw = async (ponudbaId: string) => {
    if (!confirm('Ste prepričani, da želite umakniti to ponudbo?')) return
    setWithdrawingId(ponudbaId)
    try {
      const result = await withdrawPonudbaAction(ponudbaId)
      if (!result.success) {
        setLoadError(result.error || 'Napaka pri umiku ponudbe.')
        return
      }
      loadData()
    } catch {
      setLoadError('Napaka pri umiku ponudbe.')
    } finally {
      setWithdrawingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ponudbe</h1>
        <p className="text-gray-600 mb-6">Upravljajte z vašimi ponudbami in povpraševanji</p>

        {loadError && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm flex-1">{loadError}</p>
            <Button variant="outline" size="sm" onClick={loadData} className="flex items-center gap-1">
              <RefreshCw className="w-4 h-4" />
              Poskusi znova
            </Button>
          </div>
        )}

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
              <>
                {novaPovprasevanja.map((pov) => (
                  <Card key={pov.id} className="p-5 border">
                    <div className="space-y-3">
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

                      <Button
                        onClick={() => setExpandedForm(expandedForm === pov.id ? null : pov.id)}
                        className="w-full"
                      >
                        {expandedForm === pov.id ? 'Preklici' : 'Pošlji ponudbo'}
                      </Button>

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
                ))}
                {novaHasMore && (
                  <Button variant="outline" className="w-full" onClick={loadMoreNova} disabled={loadingMore}>
                    {loadingMore ? 'Nalagam...' : 'Prikaži več'}
                  </Button>
                )}
              </>
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
                  {editingId === ponudba.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">Uredi ponudbo</h3>
                        <Badge variant={ponudba.status === 'sprejeta' ? 'default' : 'secondary'}>
                          {ponudba.status === 'sprejeta' ? '✓ Sprejeta' : 'Poslana'}
                        </Badge>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                          <Label htmlFor={`edit-msg-${ponudba.id}`}>Sporočilo</Label>
                          <Textarea
                            id={`edit-msg-${ponudba.id}`}
                            rows={4}
                            value={editForm.message}
                            onChange={(e) => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`edit-price-${ponudba.id}`}>Cena (EUR)</Label>
                          <Input
                            id={`edit-price-${ponudba.id}`}
                            type="number"
                            min={1}
                            value={editForm.price_estimate}
                            onChange={(e) => setEditForm(prev => ({ ...prev, price_estimate: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`edit-date-${ponudba.id}`}>Razpoložljiv od</Label>
                          <Input
                            id={`edit-date-${ponudba.id}`}
                            type="date"
                            value={editForm.available_date}
                            onChange={(e) => setEditForm(prev => ({ ...prev, available_date: e.target.value }))}
                          />
                        </div>
                      </div>
                      {editError && <p className="text-sm text-red-600">{editError}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditSave(ponudba.id)} disabled={editSaving}>
                          {editSaving ? 'Shranjujem...' : 'Shrani'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEditing}>Prekliči</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <Link href={`/obrtnik/povprasevanja/${ponudba.povprasevanja?.id}`}>
                          <p className="font-semibold hover:text-blue-600">{ponudba.povprasevanja?.title}</p>
                        </Link>
                        <p className="text-sm text-gray-600">{ponudba.povprasevanja?.location_city}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">€{ponudba.price_estimate}</p>
                        <p className="text-xs text-gray-600">{ponudba.price_type}</p>
                      </div>
                      <Badge variant={ponudba.status === 'sprejeta' ? 'default' : 'secondary'}>
                        {ponudba.status === 'sprejeta' ? '✓ Sprejeta' : 'Poslana'}
                      </Badge>
                      {ponudba.status === 'poslana' && (
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(ponudba)}
                            title="Uredi ponudbo"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWithdraw(ponudba.id)}
                            disabled={withdrawingId === ponudba.id}
                            title="Umakni ponudbo"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
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
                      <p className="font-semibold text-gray-600">{ponudba.povprasevanja?.title}</p>
                      {ponudba.povprasevanja?.location_city && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          {ponudba.povprasevanja.location_city}
                        </div>
                      )}
                    </div>
                    <div className="text-right mr-2">
                      <p className="font-medium text-gray-600">€{ponudba.price_estimate}</p>
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
