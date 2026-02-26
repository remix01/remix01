import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LiftGO — Najdi mojstra',
    short_name: 'LiftGo',
    description: 'Povežite se z zanesljivimi obrtniki',
    id: 'https://www.liftgo.net/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    lang: 'sl',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
    shortcuts: [
      {
        name: 'Poišči obrtnika',
        short_name: 'Iskanje',
        url: '/?utm_source=pwa_shortcut&action=search',
        icons: [{ src: '/icons/shortcut-search.png', sizes: '96x96' }],
      },
      {
        "name": "Novo povpraševanje",
        "url": "/narocnik/novo-povprasevanje",
        "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
      },
      {
        "name": "Moja povpraševanja",
        "url": "/narocnik/povprasevanja",
        "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
      }
    ],
    screenshots: [
      { src: '/screenshots/mobile-home.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
    ],
    categories: ['business', 'utilities'],
    prefer_related_applications: false,
  }
}