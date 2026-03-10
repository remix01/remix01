import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { JobTimeline } from '@/components/jobs/JobTimeline'
import { OfferCard } from '@/components/jobs/OfferCard'
import { getPublicPovprasevanjeDetail, getJobTimeline, countJobOffers } from '@/lib/dal/jobs'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const job = await getPublicPovprasevanjeDetail(params.id)

  if (!job) {
    return { title: 'LiftGO' }
  }

  return {
    title: `${job.title} v ${job.location_city} | LiftGO`,
    description: `${job.title} — ${job.description}`,
    keywords: `${job.title}, ${job.category?.name}, ${job.location_city}`,
    openGraph: {
      title: `${job.title} | LiftGO`,
      description: job.description,
      type: 'website',
      locale: 'sl_SI',
      siteName: 'LiftGO',
    },
  }
}

const statusLabel: Record<string, string> = {
  'odprto': 'Odprto',
  'v_teku': 'V teku',
  'zakljuceno': 'Zaključeno',
  'preklicano': 'Preklicano',
}

const urgencyLabel: Record<string, string> = {
  'normalno': 'Normalno',
  'kmalu': 'Kmalu',
  'nujno': 'Nujno',
}

const urgencyColor: Record<string, string> = {
  'normalno': 'bg-blue-50 text-blue-700',
  'kmalu': 'bg-orange-50 text-orange-700',
  'nujno': 'bg-red-50 text-red-700',
}

export default async function JobDetailPage(props: Props) {
  const params = await props.params
  const job = await getPublicPovprasevanjeDetail(params.id)

  if (!job) {
    notFound()
  }

  const timeline = await getJobTimeline(params.id)
  const offersCount = await countJobOffers(params.id)

  return (
    <main className="min-h-screen bg-slate-50">
      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: 'Dela', href: '/dela' },
        { name: job.title, href: `/dela/${job.id}` },
      ]} />

      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Link */}
          <Link href="/dela" className="inline-flex items-center gap-2 text-blue-600 mb-6 hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Nazaj na dela
          </Link>

          {/* Header */}
          <Card className="p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                      {job.title}
                    </h1>
                    <p className="text-slate-600 mt-2">
                      {job.category?.name}
                    </p>
                  </div>
                  <Badge className={urgencyColor[job.urgency] || ''}>
                    {urgencyLabel[job.urgency] || job.urgency}
                  </Badge>
                </div>

                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    {job.location_city}{job.location_region ? `, ${job.location_region}` : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    {job.preferred_date_from
                      ? new Date(job.preferred_date_from).toLocaleDateString('sl-SI')
                      : 'Brez datuma'}
                  </div>
                  {(job.budget_min || job.budget_max) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 flex-shrink-0" />
                      {job.budget_min && job.budget_max
                        ? `${job.budget_min} - ${job.budget_max} €`
                        : job.budget_max
                        ? `Do ${job.budget_max} €`
                        : `Od ${job.budget_min} €`}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:w-48 flex flex-col gap-3">
                <Badge variant="outline" className="text-center py-2">
                  {statusLabel[job.status] || job.status}
                </Badge>
                {job.status === 'odprto' && (
                  <Button asChild>
                    <Link href={`/narocnik/ponudba/${job.id}`}>
                      Pošlji ponudbo
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Opis dela</h2>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </p>
                {job.location_notes && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      {job.location_notes}
                    </p>
                  </div>
                )}
              </Card>

              {/* Offers */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Ponudbe ({offersCount})
                </h2>
                {job.ponudbe && job.ponudbe.length > 0 ? (
                  <div className="space-y-3">
                    {job.ponudbe.map((offer) => (
                      <OfferCard key={offer.id} offer={offer} />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-center py-8">
                    Še ni nobene ponudbe.
                  </p>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Timeline */}
              {timeline && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Časovnica</h2>
                  <JobTimeline events={timeline} />
                </Card>
              )}

              {/* Naročnik Info */}
              {job.narocnik && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Naročnik</h2>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-slate-900">
                      {job.narocnik.full_name}
                    </p>
                    {job.narocnik.location_city && (
                      <p className="text-slate-600">
                        {job.narocnik.location_city}
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
