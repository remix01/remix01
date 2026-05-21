import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/_next/static/', '/_next/image/', '/images/', '/icons/'],
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard',
          '/partner-dashboard/',
          '/auth/',
          '/partner-auth/',
          '/prijava',
          '/registracija',
          '/profil/',
          '/obvestila/',
          '/povprasevanja/',
          '/novo-povprasevanje/',
          '/ocena/',
          '/sandbox',
          '/protected',
          '/test',
          '/sentry-example-page',
          '/obrtnik/dashboard',
          '/obrtnik/narocnine',
          '/obrtnik/ponudbe',
          '/obrtnik/profil',
          '/obrtnik/sporocila',
          '/*?*sort=',
          '/*?*filter=',
          '/*?*page=',
        ],
      },
    ],
    sitemap: 'https://liftgo.net/sitemap.xml',
  }
}
