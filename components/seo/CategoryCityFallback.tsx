import Link from 'next/link'
import { Button } from '@/components/ui/button'

export type CategoryCityFallbackState =
  | 'zero_providers'
  | 'provider_lookup_error'
  | 'category_not_listed_yet'
  | 'location_not_listed_yet'
  | 'global_market_coming_soon'

type LinkItem = { label: string; href: string }

interface CategoryCityFallbackProps {
  categoryName?: string
  cityName?: string
  serviceSlug?: string
  locationSlug?: string
  state: CategoryCityFallbackState
  relatedCategories?: LinkItem[]
  relatedCities?: LinkItem[]
}

export function CategoryCityFallback({
  categoryName,
  cityName,
  state,
  serviceSlug,
  locationSlug,
  relatedCategories = [],
  relatedCities = [],
}: CategoryCityFallbackProps) {
  const service = serviceSlug ?? 'storitev'
  const location = locationSlug ?? 'lokacija'
  const source = state === 'zero_providers' ? 'market_empty' : 'market_demand'
  const inquiryHref = `/novo-povprasevanje?source=${source}&service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`
  const providerHref = `/registracija-mojster?source=${source}&service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`

  const messages: Record<CategoryCityFallbackState, string> = {
    zero_providers: 'Za to kombinacijo trenutno še nimamo aktivnih izvajalcev. Oddajte povpraševanje in LiftGO vam pomaga najti primerne mojstre, hkrati pa vabimo ponudnike k prijavi.',
    provider_lookup_error: 'Podatki o izvajalcih so začasno nedosegljivi. Povpraševanje lahko oddate takoj in ekipa LiftGO vam pomaga povezati se s primernimi izvajalci.',
    category_not_listed_yet: 'Storitev za to lokacijo še dodajamo. Oddajte povpraševanje in pomagali bomo odpreti ta trg ter povezati povpraševanje s ponudniki.',
    location_not_listed_yet: 'To lokacijo še vključujemo v marketplace. Pošljite povpraševanje in LiftGO vam pomaga najti izvajalce tudi iz širše regije.',
    global_market_coming_soon: 'LiftGO širi marketplace na nove storitve in mesta. Oddajte povpraševanje in pomagajte odpreti trg v tej kategoriji.',
  }

  return (
    <section className="py-12 md:py-16 bg-amber-50 border-y border-amber-100">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">LiftGO marketplace – povpraševanje najprej</h2>
        <p className="text-gray-700 max-w-3xl mb-2">
          {categoryName || 'Storitev'}{cityName ? ` v ${cityName}` : ''}
        </p>
        <p className="text-gray-700 max-w-3xl mb-6">{messages[state]}</p>

        <div className="flex flex-wrap gap-3 mb-8">
          <Link href={inquiryHref}><Button size="lg">Oddaj brezplačno povpraševanje</Button></Link>
          <Link href={providerHref}><Button size="lg" variant="outline">Registriraj se kot izvajalec</Button></Link>
          <Link href="/mojstri"><Button size="lg" variant="outline">Prebrskaj mojstre</Button></Link>
          <Link href="/"><Button size="lg" variant="ghost">Domov</Button></Link>
        </div>

        {relatedCities.length > 0 && <div className="mb-6"><h3 className="font-semibold mb-2">Poskusi bližnja mesta</h3><div className="flex flex-wrap gap-2">{relatedCities.map(i => <Link key={i.href} href={i.href} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">{i.label}</Link>)}</div></div>}
        {relatedCategories.length > 0 && <div><h3 className="font-semibold mb-2">Sorodne storitve</h3><div className="flex flex-wrap gap-2">{relatedCategories.map(i => <Link key={i.href} href={i.href} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">{i.label}</Link>)}</div></div>}
      </div>
    </section>
  )
}
