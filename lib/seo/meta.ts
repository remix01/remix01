// SEO Meta generation utilities

export function generateCategoryMeta(params: {
  categoryName: string
  categorySlug: string
  cityName?: string
  citySlug?: string
}) {
  const location = params.cityName || 'Sloveniji'
  const locationGenitive = params.cityName 
    ? 'v ' + params.cityName 
    : 'po vsej Sloveniji'

  return {
    title: params.categoryName + ' ' + locationGenitive + 
           ' | LiftGO — Preverjeni mojstri',
    description: 'Iščete zanesljivega ' + 
      params.categoryName.toLowerCase() + ' ' + locationGenitive + 
      '? Na LiftGO najdete preverjene mojstre z ocenami strank. ' +
      'Brezplačno povpraševanje, odziv v 2 urah.',
    keywords: [
      params.categoryName.toLowerCase(),
      params.categoryName.toLowerCase() + ' ' + location.toLowerCase(),
      'mojster ' + location.toLowerCase(),
      'obrtnik ' + location.toLowerCase(),
      params.categorySlug,
      'liftgo'
    ].join(', '),
    openGraph: {
      title: params.categoryName + ' ' + locationGenitive + ' | LiftGO',
      description: 'Preverjeni ' + 
        params.categoryName.toLowerCase() + ' mojstri ' + 
        locationGenitive + '. Ocene, cene, hiter odziv.',
      type: 'website' as const,
      locale: 'sl_SI',
      siteName: 'LiftGO'
    }
  }
}

export function generateLocalBusinessSchema(params: {
  categoryName: string
  cityName: string
  obrtnikCount: number
  avgRating: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    'name': params.categoryName + ' v ' + params.cityName,
    'provider': {
      '@type': 'LocalBusiness',
      'name': 'LiftGO',
      'url': 'https://liftgo.net',
      'areaServed': params.cityName + ', Slovenija'
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': params.avgRating.toFixed(1),
      'reviewCount': params.obrtnikCount,
      'bestRating': '5',
      'worstRating': '1'
    }
  }
}
