// app/manifest.ts
// Next.js 13+ Metadata API — servira na /manifest.json
// POZOR: izbriši public/manifest.json — sicer konflikt!

import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LiftGO — Najdi obrtnika v Sloveniji',
    short_name: 'LiftGO',
    description: 'Povežemo vas z zanesljivimi preverjenimi obrtniki po vsej Sloveniji.',
    // Stabilen ID — nikoli ne spremeniti po prvem deployu!
    id: 'https://www.liftgo.net/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    // Mora ujemati CSS ozadje splash screena
    background_color: '#0f172a',
    theme_color: '#0f172a',
    lang: 'sl',
    dir: 'ltr',
    categories: ['business', 'utilities'],
    prefer_related_applications: false,

    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],

    shortcuts: [
      {
        name: 'Poišči obrtnika',
        short_name: 'Iskanje',
        description: 'Hitro iskanje obrtnika',
        url: '/?utm_source=pwa_shortcut&action=search',
        icons: [{ src: '/icons/shortcut-search.png', sizes: '96x96' }],
      },
      {
        name: 'Moje naročilo',
        short_name: 'Naročila',
        description: 'Pregled mojih naročil',
        url: '/narocnik/narocila?utm_source=pwa_shortcut',
        icons: [{ src: '/icons/shortcut-orders.png', sizes: '96x96' }],
      },
    ],

    screenshots: [
      {
        src: '/screenshots/mobile-home.png',
        sizes: '390x844',
        type: 'image/png',
        // @ts-expect-error — form_factor je v spec a Next.js tipi ga še ne vključujejo
        form_factor: 'narrow',
        label: 'LiftGO domača stran',
      },
    ],
  }
}