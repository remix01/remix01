import Link from 'next/link'
import { SLOVENIAN_CITIES } from '@/lib/seo/locations'

interface RelatedCitiesProps {
  categorySlug: string
  categoryName: string
  currentCitySlug?: string
}

export function RelatedCities({
  categorySlug,
  categoryName,
  currentCitySlug
}: RelatedCitiesProps) {
  return (
    <section className="py-12 md:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12">
          {categoryName} po mestih v Sloveniji
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SLOVENIAN_CITIES.map(city => (
            <Link
              key={city.slug}
              href={`/${categorySlug}/${city.slug}`}
              className={`p-4 rounded-lg transition-all ${
                city.slug === currentCitySlug
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border hover:shadow-md border-gray-200'
              }`}
            >
              <p className="font-medium text-sm text-balance text-center">
                {categoryName.split(' ')[0]} {city.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
