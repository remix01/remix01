import type { Metadata } from 'next'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { CraftsmanCatalog } from '@/components/marketplace/CraftsmanCatalog'
import { listVerifiedObrtnikiWithFilters } from '@/lib/dal/partners'
import { getActiveCategories } from '@/lib/dal/categories'

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

export default async function CraftsmenCatalogPage() {
  // Fetch initial craftsment (top rated, limit to 100 for initial load)
  const initialCraftsmen = await listVerifiedObrtnikiWithFilters({
    is_available: true,
    limit: 100,
  })

  // Fetch categories for filters
  const categories = await getActiveCategories()

  return (
    <main className="min-h-screen bg-slate-50">
      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: 'Mojstri', href: '/mojstri' },
      ]} />

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              Katalog mojstrov
            </h1>
            <p className="text-slate-600 mt-2">
              Poiščite preverjene mojstre v vaši bližini. Preglejte ocene, izkušnje in ponudbe.
            </p>
          </div>

          {/* Catalog Component */}
          <CraftsmanCatalog
            initialCraftsmen={initialCraftsmen}
            categories={categories}
            onFilterChange={async (filters) => {
              'use server'
              return await listVerifiedObrtnikiWithFilters(filters)
            }}
          />
        </div>
      </section>
    </main>
  )
}
