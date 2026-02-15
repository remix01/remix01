import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import SearchContent from './search-content'
import { getMetadataForCategory } from './metadata'
import { JsonLd } from '../components/JsonLd'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const storitev = typeof params.storitev === 'string' ? params.storitev : null
  const lokacija = typeof params.lokacija === 'string' ? params.lokacija : null

  const { title, description } = getMetadataForCategory(storitev, lokacija)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.liftgo.net/search${storitev ? `?storitev=${storitev}` : ''}`,
      siteName: 'LiftGO',
      locale: 'sl_SI',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://www.liftgo.net/search${storitev ? `?storitev=${storitev}` : ''}`,
    },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const storitev = typeof params.storitev === 'string' ? params.storitev : null
  const lokacija = typeof params.lokacija === 'string' ? params.lokacija : 'Sloveniji'

  // Service schema for categories
  const serviceSchema = storitev ? {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": storitev,
    "provider": {
      "@type": "Organization",
      "name": "LiftGO",
      "url": "https://www.liftgo.net"
    },
    "areaServed": {
      "@type": "Place",
      "name": lokacija || "Slovenia"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": `${storitev} v ${lokacija}`,
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": storitev
          }
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1200",
      "bestRating": "5"
    }
  } : null

  return (
    <>
      {serviceSchema && <JsonLd data={serviceSchema} />}
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            <SearchContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  )
}
