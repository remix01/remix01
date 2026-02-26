// app/robots.ts
// Next.js 13+ Metadata API — liftgo.net
// Polna PWA podpora: manifest, SW, push, ikone

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ─── Googlebot in vsi standardni crawlerji ───
      {
        userAgent: '*',
        allow: [
          '/',
          // Next.js build assets — OBVEZNO da Googlebot vidi vsebino
          '/_next/static/',
          '/_next/image/',
          // PWA — Web App Manifest
          '/manifest.json',
          // PWA — Service Worker
          '/sw.js',
          '/service-worker.js',
          '/workbox-*.js',        // next-pwa generira workbox-*.js datoteke
          // PWA — Ikone & splash screeni
          '/icons/',
          '/icon-*.png',
          '/apple-icon.png',
          '/apple-touch-icon.png',
          '/favicon.ico',
          '/favicon-*.png',
          '/splash/',
          // PWA — Web push (VAPID public key endpoint sme biti dostopen)
          '/api/push/public-key',
        ],
        disallow: [
          // Zasebne uporabniške poti
          '/partner-auth/',
          '/partner-dashboard',
          '/narocnik/',
          '/obrtnik/',
          // API (razen javnega push endpointa zgoraj)
          '/api/',
          '/admin/',
          // Prepreči duplicate content iz URL parametrov
          '/*?*sort=',
          '/*?*filter=',
          '/*?*page=',
        ],
      },

      // ─── AI trening boti — vsak v svojem bloku ───
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      },
      {
        userAgent: 'Claude-Web',
        disallow: ['/'],
      },
      {
        userAgent: 'PerplexityBot',
        disallow: ['/'],
      },
      {
        userAgent: 'Amazonbot',
        disallow: ['/'],
      },
      {
        userAgent: 'Bytespider',
        disallow: ['/'],
      },
      {
        userAgent: 'Diffbot',
        disallow: ['/'],
      },
    ],

    sitemap: 'https://www.liftgo.net/sitemap.xml',

    // OPOMBA: 'Host' direktiva je Yandex-specifična in jo je
    // potrebno nastaviti kot 301 redirect v next.config.js,
    // ne tukaj — Google jo ignorira.
  }
}