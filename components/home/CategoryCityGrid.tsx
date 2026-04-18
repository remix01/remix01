import Link from 'next/link'
import { Building2, Wrench } from 'lucide-react'

const DEFAULT_CATEGORY_SLUG = 'vodovodar'

const fallbackCategories = [
  { label: 'Vodovodar', slug: 'vodovodar' },
  { label: 'Električar', slug: 'elektricar' },
  { label: 'Slikopleskar', slug: 'slikopleskar' },
  { label: 'Keramičar', slug: 'keramicar' },
  { label: 'Klima servis', slug: 'klima-servis' },
  { label: 'Mizar', slug: 'mizar' },
]

const cities = [
  { label: 'Ljubljana', slug: 'ljubljana' },
  { label: 'Maribor', slug: 'maribor' },
  { label: 'Celje', slug: 'celje' },
  { label: 'Kranj', slug: 'kranj' },
  { label: 'Koper', slug: 'koper' },
  { label: 'Novo mesto', slug: 'novo-mesto' },
]

interface CategoryCityGridProps {
  categories?: Array<{ label: string; slug: string }>
}

export function CategoryCityGrid({ categories: sourceCategories = fallbackCategories }: CategoryCityGridProps) {
  const hasDirectoryCategories = sourceCategories.length > 0
  const activeCategorySlug = sourceCategories[0]?.slug || DEFAULT_CATEGORY_SLUG
  const renderedCategories = sourceCategories.length > 0 ? sourceCategories : fallbackCategories

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><Wrench className="h-4 w-4" />Top kategorije</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {renderedCategories.map((item) => (
            <Link
              key={item.slug}
              href={hasDirectoryCategories ? `/${item.slug}/ljubljana` : `/mojstri?category=${encodeURIComponent(item.slug)}`}
              className="min-h-11 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><Building2 className="h-4 w-4" />Najbolj iskana mesta</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {cities.map((item) => (
            <Link
              key={item.slug}
              href={hasDirectoryCategories ? `/${activeCategorySlug}/${item.slug}` : `/mojstri?location=${encodeURIComponent(item.label)}`}
              className="min-h-11 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
