import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPovprasevanje } from '@/lib/dal/povprasevanja'
import { getPublicObrtnikProfile } from '@/lib/dal/partners'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, DollarSign, AlertCircle, CheckCircle, User, MessageSquare } from 'lucide-react'
import { JobTimeline } from '@/components/jobs/JobTimeline'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import type { Povprasevanje } from '@/types/marketplace'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const povprasevanje = await getPovprasevanje(params.id)

  if (!povprasevanje) {
    return { title: 'LiftGO' }
  }

  return {
    title: `${povprasevanje.title} | LiftGO`,
    description: povprasevanje.description.substring(0, 160),
    openGraph: {
      title: povprasevanje.title,
      description: povprasevanje.description,
      type: 'website',
      locale: 'sl_SI',
      siteName: 'LiftGO',
    },
  }
}

export default async function JobDetailPage(props: Props) {
  const params = await props.params
  const povprasevanje = await getPovprasevanje(params.id)

  if (!povprasevanje) {
    notFound()
  }

  // Build timeline events
  const timelineEvents = [
    {
      step: 'Povpraševanje oddano',
      status: 'completed' as const,
      date: povprasevanje.created_at,
      icon: 'CheckCircle2',
    },
    {
      step: 'Ponudbe prejet',
      status: (povprasevanje.ponudbe_count ?? 0) > 0 ? ('completed' as const) : ('pending' as const),
      date: povprasevanje.ponudbe?.[0]?.created_at,
      icon: 'CheckCircle2',
    },
    {
      step: 'Ponudba sprejeta',
      status: povprasevanje.status === 'v_teku' || povprasevanje.status === 'zakljuceno' ? ('completed' as const) : ('pending' as const),
      icon: 'CheckCircle2',
    },
    {
      step: 'Delo v teku',
      status: povprasevanje.status === 'v_teku' ? ('in_progress' as const) : povprasevanje.status === 'zakljuceno' ? ('completed' as const) : ('pending' as const),
      icon: 'Clock',
    },
    {
      step: 'Delo zaključeno',
      status: povprasevanje.status === 'zakljuceno' ? ('completed' as const) : ('pending' as const),
      icon: 'CheckCircle2',
    },
  ]

  // Map status to badge colors
  const statusBadgeMap: Record<string, { label: string; color: string }> = {
    odprto: { label: 'Odprto', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    v_teku: { label: 'V teku', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    zakljuceno: { label: 'Zaključeno', color: 'bg-green-50 text-green-700 border border-green-200' },
    preklicano: { label: 'Preklicano', color: 'bg-red-50 text-red-700 border border-red-200' },
  }

  const statusBadge = statusBadgeMap[povprasevanje.status] || statusBadgeMap.odprto

  return (
    <>
      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: 'Povpraševanja', href: '/jobs' },
        { name: povprasevanje.title, href: `/jobs/${povprasevanje.id}` },
      ]} />

      <main className="min-h-screen bg-slate-50">
        {/* Header */}
        <section className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href="/jobs" className="inline-flex items-center gap-2 text-blue-600 mb-6 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Nazaj
            </Link>

            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{povprasevanje.title}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge className={statusBadge.color}>
                  {statusBadge.label}
                </Badge>
                {povprasevanje.urgency && (
                  <Badge variant="secondary">
                    {povprasevanje.urgency === 'nujno' ? '⚡ Nujno' : povprasevanje.urgency === 'kmalu' ? '🔥 Kmalu' : '📅 Normalno'}
                  </Badge>
                )}
                <Badge variant="outline">{povprasevanje.ponudbe_count || 0} ponudb</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Opis</h2>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {povprasevanje.description}
                  </p>
                </Card>

                {/* Details Grid */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Podrobnosti</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Location */}
                    <div>
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">Lokacija</span>
                      </div>
                      <p className="font-semibold">{povprasevanje.location_city}</p>
                      {povprasevanje.location_notes && (
                        <p className="text-sm text-slate-600 mt-1">{povprasevanje.location_notes}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <span className="text-sm font-medium">Kategorija</span>
                      </div>
                      <p className="font-semibold">{povprasevanje.category?.name || 'Neznana'}</p>
                    </div>

                    {/* Preferred Dates */}
                    {(povprasevanje.preferred_date_from || povprasevanje.preferred_date_to) && (
                      <div>
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">Datum</span>
                        </div>
                        <p className="font-semibold">
                          {povprasevanje.preferred_date_from 
                            ? new Date(povprasevanje.preferred_date_from).toLocaleDateString('sl-SI')
                            : 'Ne navedeno'}
                          {povprasevanje.preferred_date_to && (
                            <>
                              {' - '}
                              {new Date(povprasevanje.preferred_date_to).toLocaleDateString('sl-SI')}
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Budget */}
                    {(povprasevanje.budget_min || povprasevanje.budget_max) && (
                      <div>
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-sm">Budget</span>
                        </div>
                        <p className="font-semibold">
                          {povprasevanje.budget_min && povprasevanje.budget_max
                            ? `€${povprasevanje.budget_min} - €${povprasevanje.budget_max}`
                            : povprasevanje.budget_max
                            ? `Do €${povprasevanje.budget_max}`
                            : `Od €${povprasevanje.budget_min}`}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Timeline */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Zgodovina</h2>
                  <JobTimeline events={timelineEvents} />
                </Card>
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Client Info */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Naročnik
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600">Ime</p>
                      <p className="font-semibold">{povprasevanje.narocnik?.full_name || 'Neznano'}</p>
                    </div>
                    {povprasevanje.narocnik?.location_city && (
                      <div>
                        <p className="text-sm text-slate-600">Mesto</p>
                        <p className="font-semibold">{povprasevanje.narocnik.location_city}</p>
                      </div>
                    )}
                    <Button className="w-full" variant="outline" size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Sporočilo
                    </Button>
                  </div>
                </Card>

                {/* Offers Count */}
                <Card className="p-6 bg-blue-50 border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Prejete ponudbe</p>
                      <p className="text-3xl font-bold text-blue-900">{povprasevanje.ponudbe_count || 0}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-500" />
                  </div>
                </Card>

                {/* Status Info */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    Info
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Objavljeno: {new Date(povprasevanje.created_at).toLocaleDateString('sl-SI')}</li>
                    <li>• Status: {statusBadge.label}</li>
                    <li>• ID povpraševanja: {povprasevanje.id}</li>
                  </ul>
                </Card>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
