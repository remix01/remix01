import type { Metadata } from 'next'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { CatalogFilters } from '@/components/mojstri/CatalogFilters'
import { MojsterCard } from '@/components/mojstri/MojsterCard'
import { listVerifiedObrtniki, getActiveSpecialnosti, getActiveLokacije } from '@/lib/dal/obrtniki'

export const revalidate = 60 // ISR — osveži vsakih 60 sekund

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

  const minRating   = searchParams.rating    ? parseFloat(searchParams.rating as string) : undefined
  const search      = searchParams.search    as string | undefined
  const kategorija  = searchParams.kategorija as string | undefined
  const lokacija    = searchParams.lokacija  as string | undefined

  const [obrtniki, availableSpecialnosti, availableLokacije] = await Promise.all([
    listVerifiedObrtniki({ minRating, search, kategorija, lokacija, limit: 50 }),
    getActiveSpecialnosti(),
    getActiveLokacije(),
  ])

  return (
    <main className="min-h-screen bg-muted">
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
            <h1 className="text-3xl font-bold text-foreground">Katalog mojstrov</h1>
            <p className="text-muted-foreground mt-2">
              Poiščite preverjene mojstre v vaši bližini. Preglejte ocene, izkušnje in ponudbe.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
              <CatalogFilters
                specialnosti={availableSpecialnosti}
                lokacije={availableLokacije}
                currentFilters={{ minRating, search, kategorija, lokacija }}
              />
            </aside>

            <section className="lg:col-span-3">
              {obrtniki.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Našli smo {obrtniki.length} {obrtniki.length === 1 ? 'mojstra' : 'mojstrov'}
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {obrtniki.map((obrtnik) => (
                      <MojsterCard
                        key={obrtnik.id}
                        obrtnik={obrtnik}
                        categories={obrtnik.categories}
                        isAvailable={obrtnik.is_available}
                        hourlyRate={obrtnik.hourly_rate}
                        yearsExperience={obrtnik.years_experience}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16 px-4 text-center">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Ni rezultatov
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Za izbrane filtre nismo našli mojstrov. Poskusite z drugačnimi kriteriji ali oddajte povpraševanje.
                  </p>
                  <a
                    href="/novo-povprasevanje"
                    className="inline-flex min-h-11 items-center justify-center px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                  >
                    Oddaj povpraševanje
                  </a>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
