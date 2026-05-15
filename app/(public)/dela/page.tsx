import type { Metadata } from 'next'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { listPovprasevanja } from '@/lib/dal/povprasevanja'

export const metadata: Metadata = {
  title: 'Odpirta dela | LiftGO',
  description: 'Pregled odprtih del in povpraševanj za obrtništvo v Sloveniji.',
  openGraph: {
    title: 'Odpirta dela | LiftGO',
    description: 'Pregled odprtih del in povpraševanj',
    type: 'website',
    locale: 'sl_SI',
    siteName: 'LiftGO',
  },
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

export default async function JobsListPage() {
  // Fetch open jobs
  const jobs = await listPovprasevanja({
    status: 'new',
    limit: 50,
  })

  return (
    <main className="min-h-screen bg-slate-50">
      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: 'Odpirta dela', href: '/dela' },
      ]} />

      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              Odpirta dela
            </h1>
            <p className="text-slate-600 mt-2">
              {jobs.length === 0
                ? 'Trenutno ni odprtih del.'
                : `Prikazano ${jobs.length} odprtih povpraševanj`}
            </p>
          </div>

          {/* Jobs List */}
          {jobs.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">Trenutno ni odprtih del.</p>
              <Button asChild>
                <Link href="/mojstri">Oglejte si mojstre</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/dela/${job.id}`}
                  className="block hover:no-underline"
                >
                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Main Content */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div>
                            <h2 className="text-xl font-semibold text-slate-900">
                              {job.title}
                            </h2>
                            <p className="text-slate-600 text-sm mt-1">
                              {job.category?.name}
                            </p>
                          </div>
                          <Badge className={urgencyColor[job.urgency] || ''}>
                            {urgencyLabel[job.urgency] || job.urgency}
                          </Badge>
                        </div>

                        {/* Description */}
                        <p className="text-slate-700 text-sm mb-4 line-clamp-2">
                          {job.description}
                        </p>

                        {/* Details */}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location_city}
                          </div>
                          {job.preferred_date_from && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(job.preferred_date_from).toLocaleDateString('sl-SI')}
                            </div>
                          )}
                          {job.budget_max && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              Do {job.budget_max} €
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="md:w-32 flex flex-col items-end justify-between">
                        {job.ponudbe_count !== undefined && (
                          <Badge variant="outline">
                            {job.ponudbe_count} ponudb
                          </Badge>
                        )}
                        <Button variant="outline" size="sm" className="mt-2">
                          Oglejte si
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
