import Link from 'next/link'
import { Button } from '@/components/ui/button'

type LinkItem = { label: string; href: string }

interface CategoryCityFallbackProps {
  categoryName?: string
  cityName?: string
  relatedCategories?: LinkItem[]
  relatedCities?: LinkItem[]
}

export function CategoryCityFallback({
  categoryName,
  cityName,
  relatedCategories = [],
  relatedCities = [],
}: CategoryCityFallbackProps) {
  return (
    <section className="py-12 md:py-16 bg-amber-50 border-y border-amber-100">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Trenutno še ni aktivnih mojstrov za to kombinacijo
        </h2>
        <p className="text-gray-700 max-w-3xl mb-6">
          Ne najdemo še mojstrov za{' '}
          <strong>{categoryName ? categoryName.toLowerCase() : 'to storitev'}</strong>
          {cityName ? <> v mestu <strong>{cityName}</strong></> : null}, ampak lahko oddate povpraševanje in LiftGO vam pomaga najti primerne izvajalce.
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          <Link href="/novo-povprasevanje">
            <Button size="lg">Oddaj brezplačno povpraševanje</Button>
          </Link>
          <Link href="/mojstri">
            <Button size="lg" variant="outline">Prebrskaj mojstre</Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="ghost">Odpri AI pomočnika na domov</Button>
          </Link>
        </div>

        {relatedCities.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Poskusi bližnja mesta</h3>
            <div className="flex flex-wrap gap-2">
              {relatedCities.map((item) => (
                <Link key={item.href} href={item.href} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {relatedCategories.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Morda vas zanimajo tudi sorodne storitve</h3>
            <div className="flex flex-wrap gap-2">
              {relatedCategories.map((item) => (
                <Link key={item.href} href={item.href} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
