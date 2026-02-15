import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/partner-auth/',     // login/signup strani — ne indeksiraj
          '/partner-dashboard', // zasebna nadzorna plošča
          '/api/',              // API endpointi
          '/_next/',            // Next.js interni fajli
          '/admin/',            // admin panel če obstaja
        ],
      },
      {
        // Prepreči AI scraperje od zbiranja podatkov
        userAgent: [
          'GPTBot',
          'ChatGPT-User', 
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
        ],
        disallow: '/',
      },
    ],
    sitemap: 'https://www.liftgo.net/sitemap.xml',
    host: 'https://www.liftgo.net',
  }
}
