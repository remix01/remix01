import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Star, MapPin, CheckCircle, ArrowLeft, MessageSquare } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'

// This would fetch from your database
async function getObrtnikProfile(id: string) {
  // TODO: Implement actual database fetch
  // For now, return a mock object structure
  return {
    id,
    name: 'Primer Obrtnik',
    business_name: 'Primer d.o.o.',
    phone: '+386 1 234 5678',
    email: 'info@primer.si',
    location_city: 'Ljubljana',
    bio: 'Strokovnjak z več kot 10 let izkušenj',
    categories: [{ id: '1', name: 'Vodovodna dela', slug: 'vodovodna-dela' }],
    avg_rating: 4.8,
    review_count: 24,
    is_verified: true,
    created_at: new Date('2020-01-01')
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const obrtnik = await getObrtnikProfile(params.id)

  if (!obrtnik) {
    return { title: 'LiftGO' }
  }

  const categoryNames = obrtnik.categories.map(c => c.name).join(', ')

  return {
    title: `${obrtnik.business_name} — ${categoryNames} v ${obrtnik.location_city} | LiftGO`,
    description: `Preverite profil, ocene in cene za ${obrtnik.business_name} na LiftGO. ${obrtnik.bio}`,
    keywords: `${obrtnik.business_name}, ${categoryNames}, ${obrtnik.location_city}, mojster, obrtnik`,
    openGraph: {
      title: `${obrtnik.business_name} na LiftGO`,
      description: `Preverjeni strokovnjak: ${obrtnik.bio}`,
      type: 'website',
      locale: 'sl_SI',
      siteName: 'LiftGO'
    }
  }
}

export default async function ObrtnikProfilePage(props: Props) {
  const params = await props.params
  const obrtnik = await getObrtnikProfile(params.id)

  if (!obrtnik) {
    notFound()
  }

  // Generate Person + LocalBusiness schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'LocalBusiness'],
    'name': obrtnik.business_name,
    'image': '/api/placeholder/obrtnik-avatar.jpg',
    'jobTitle': obrtnik.categories.map(c => c.name).join(' in '),
    'contactPoint': {
      '@type': 'ContactPoint',
      'contactType': 'Customer Service',
      'telephone': obrtnik.phone,
      'email': obrtnik.email
    },
    'areaServed': {
      '@type': 'City',
      'name': obrtnik.location_city,
      'addressCountry': 'SI'
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': obrtnik.avg_rating.toFixed(1),
      'reviewCount': obrtnik.review_count,
      'bestRating': '5',
      'worstRating': '1'
    },
    'sameAs': [
      'https://liftgo.net/obrtniki/' + obrtnik.id
    ]
  }

  const categoryNames = obrtnik.categories.map(c => c.name).join(', ')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: categoryNames, href: '/' + obrtnik.categories[0]?.slug || '#' },
        { name: obrtnik.business_name, href: '/obrtniki/' + obrtnik.id }
      ]} />

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <section className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Link href={-1 as any} className="inline-flex items-center gap-2 text-blue-600 mb-6 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Nazaj
            </Link>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {obrtnik.business_name.charAt(0)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {obrtnik.business_name}
                    </h1>
                    <p className="text-gray-600 mb-4">{categoryNames}</p>
                  </div>
                  {obrtnik.is_verified && (
                    <div className="flex items-center gap-1 bg-green-50 px-3 py-2 rounded-full">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Preverjen</span>
                    </div>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5"
                        fill={i < Math.floor(obrtnik.avg_rating) ? 'currentColor' : 'none'}
                        className={i < Math.floor(obrtnik.avg_rating) ? 'text-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{obrtnik.avg_rating.toFixed(1)}</span>
                  <span className="text-gray-600">({obrtnik.review_count} ocen)</span>
                </div>

                {/* Location & Contact */}
                <div className="flex flex-col gap-3 text-sm mb-6">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    {obrtnik.location_city}, Slovenija
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                    {obrtnik.email}
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3">
                  <Link href="/narocnik/novo-povprasevanje">
                    <Button size="lg">
                      Pošlji povpraševanje
                    </Button>
                  </Link>
                  <a href={`tel:${obrtnik.phone}`}>
                    <Button variant="outline" size="lg">
                      Pokliči
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">O mojstru</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {obrtnik.bio}
            </p>
            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Storitve</h3>
              <div className="flex flex-wrap gap-2">
                {obrtnik.categories.map(category => (
                  <Link
                    key={category.id}
                    href={`/${category.slug}`}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section Placeholder */}
        <section className="py-12 bg-white border-t">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Ocene ({obrtnik.review_count})</h2>
            <div className="text-center py-12 text-gray-500">
              <p>Ocene se bodo prikažile tukaj</p>
            </div>
          </div>
        </section>

        {/* Related Categories */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Podobne storitve</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {obrtnik.categories.slice(0, 3).map(category => (
                <Link
                  key={category.id}
                  href={`/${category.slug}/${obrtnik.location_city.toLowerCase()}`}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold">{category.name}</p>
                  <p className="text-sm text-gray-600">v {obrtnik.location_city}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
