import type { MetadataRoute } from 'next'

const PRIVATE_PATHS = [
  '/api/',
  '/admin/',
  '/auth/',
  '/partner-auth/',
  '/sandbox',
  '/protected',
  '/test',
  '/sentry-example-page',
]

const USER_PRIVATE_PATHS = [
  '/dashboard',
  '/partner-dashboard/',
  '/prijava',
  '/registracija',
  '/profil/',
  '/obvestila/',
  '/povprasevanja/',
  '/novo-povprasevanje/',
  '/ocena/',
  '/obrtnik/dashboard',
  '/obrtnik/narocnine',
  '/obrtnik/ponudbe',
  '/obrtnik/profil',
  '/obrtnik/sporocila',
  '/*?*sort=',
  '/*?*filter=',
  '/*?*page=',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: [...PRIVATE_PATHS, ...USER_PRIVATE_PATHS],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/'],
        disallow: [...PRIVATE_PATHS, ...USER_PRIVATE_PATHS],
      },
      {
        userAgent: '*',
        allow: ['/', '/_next/static/', '/_next/image/', '/images/', '/icons/'],
        disallow: [...PRIVATE_PATHS, ...USER_PRIVATE_PATHS],
      },
    ],
    sitemap: 'https://liftgo.net/sitemap.xml',
  }
}
