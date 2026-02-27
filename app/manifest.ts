// app/manifest.ts
// Next.js 13+ Metadata API — servira na /manifest.json

import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LiftGO — Najdi obrtnika v Sloveniji',
    short_name: 'LiftGO',
    description: 'Povežemo vas z zanesljivimi preverjenimi obrtniki po vsej Sloveniji.',
    id: 'https://www.liftgo.net/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    lang: 'sl',
    dir: 'ltr',
    categories: ['business', 'utilities'],
    prefer_related_applications: false,
    icons: [],
    shortcuts: [
      {
        name: 'Poišči obrtnika',
        short_name: 'Iskanje',
        description: 'Hitro iskanje obrtnika',
        url: '/?utm_source=pwa_shortcut&action=search',
        icons: [],
      },
      {
        name: 'Moje naročilo',
        short_name: 'Naročila',
        description: 'Pregled mojih naročil',
        url: '/narocnik/narocila?utm_source=pwa_shortcut',
        icons: [],
      },
    ],
    screenshots: [],
  }
}
