import type { Metadata } from 'next'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { CatalogFilters } from '@/components/mojstri/CatalogFilters'
import { MojsterCard } from '@/components/mojstri/MojsterCard'
import { listVerifiedObrtniki, getActiveSpecialnosti, getActiveLokacije } from '@/lib/dal/obrtniki'

export const metadata: Metadata = {
  title: 'Katalog mojstrov | LiftGO',
  description: 'Odkrijte preverjene mojstre in obrtnika blizu vas. Primerjajte ocene, cene in storitve.',
  keywords: 'mojstri, obrtniki, storitve, Ljubljana, Slovenija',
  openGraph: {
    title: 'Katalog mojstrov | LiftGO',
    description: 'Odkrijte preverjene mojstre in obrtnika blizu vas.',
    type: 'website',
    locale: 'sl_SI',
    siteName: 'LiftGO',
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MojstriCatalogPage(props: PageProps) {
  const searchParams = await props.searchParams

  // Parse filters from URL parameters
  const minRating = searchParams.rating ? parseFloat(searchParams.rating as string) : undefined
  const search = searchParams.search as string | undefined

  // Fetch filtered obrtniki based on URL params
  const obrtniki = await listVerifiedObrtniki({
    minRating,
    search,
    limit: 50,
  })

  // Fetch filter options (for future use when obrtnik_categories table exists)
  const [availableSpecialnosti, availableLokacije] = await Promise.all([
    getActiveSpecialnosti(),
    getActiveLokacije(),
  ])

  return (
    <main className="min-h-screen bg-slate-50">
      <Breadcrumb
        items={[
          { name: 'Domov', href: '/' },
          { name: 'Mojstri', href: '/mojstri' },
        ]}
      />

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Katalog mojstrov</h1>
            <p className="text-slate-600 mt-2">
              Poiščite preverjene mojstre v vaši bližini. Preglejte ocene, izkušnje in ponudbe.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
              <CatalogFilters
                specialnosti={availableSpecialnosti}
                lokacije={availableLokacije}
                currentFilters={{
                  minRating,
                  search,
                }}
              />
            </aside>

            {/* Results */}
            <section className="lg:col-span-3">
              {obrtniki.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Našli smo {obrtniki.length} mojstrov
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {obrtniki.map((obrtnik) => (
                      <MojsterCard key={obrtnik.id} obrtnik={obrtnik} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 py-12">
                  <p className="text-slate-600">
                    Noben mojster ne ustreza vašim kriterijem. Poskusite z drugačnimi filtri.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
