// app/robots.ts
// Next.js 13+ Metadata API
// POZOR: izbriši public/robots.txt — sicer konflikt!

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ─── Googlebot in vsi standardni crawlerji ───────────────────────
      {
        userAgent: '*',
        allow: [
          '/',
          // Next.js build assets — OBVEZNO, brez tega Googlebot vidi prazno stran
          '/_next/static/',
          '/_next/image/',
          // PWA datoteke
          '/manifest.json',
          '/sw.js',
          '/icons/',
          '/apple-touch-icon.png',
          '/favicon.ico',
        ],
        disallow: [
          '/partner-auth/',
          '/partner-dashboard',
          '/narocnik/',
          '/obrtnik/',
          '/api/',
          '/admin/',
          // Prepreči duplicate content iz URL parametrov
          '/*?*sort=',
          '/*?*filter=',
          '/*?*page=',
        ],
      },

      // ─── AI trening boti — vsak v svojem bloku ───────────────────────
      { userAgent: 'GPTBot', disallow: ['/'] },
      { userAgent: 'ChatGPT-User', disallow: ['/'] },
      { userAgent: 'CCBot', disallow: ['/'] },
      { userAgent: 'anthropic-ai', disallow: ['/'] },
      { userAgent: 'Claude-Web', disallow: ['/'] },
      { userAgent: 'PerplexityBot', disallow: ['/'] },
      { userAgent: 'Amazonbot', disallow: ['/'] },
      { userAgent: 'Bytespider', disallow: ['/'] },
      { userAgent: 'Diffbot', disallow: ['/'] },
    ],

    sitemap: 'https://www.liftgo.net/sitemap.xml',
  }
}