import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import Script from 'next/script'
import { JsonLd } from './components/JsonLd'
import { CookieConsent } from '@/components/cookie-consent'
import { ServiceWorkerRegistration } from '@/components/liftgo/ServiceWorkerRegistration'
import { AgentChatButton } from '@/components/agent/AgentChatButton'

import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-dm-sans' })

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f172a' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f1a' },
  ],
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,           // Dovoli zoom za dostopnost (ne blokiraj!)
  userScalable: true,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.liftgo.net'),
  title: {
    default: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    template: '%s | LiftGO',
  },
  description: 'Povežemo vas z zanesljivimi preverjenimi obrtniki po vsej Sloveniji. Brezplačno povpraševanje, odziv v 24 urah. 225+ aktivnih mojstrov.',
  keywords: [
    'obrtnik', 'mojster', 'Slovenija', 'vodovodar', 'elektrikar', 'parketar', 'malar',
    'vodoinstalater', 'mizar', 'Ljubljana', 'Maribor', 'renovacija', 'popravilo', 'LiftGO', 'adaptacije'
  ],
  // Kanonična domena
  metadataBase: new URL('https://www.liftgo.net'),
  alternates: {
    canonical: '/',
  },
  // ─── PWA specifično ───
  applicationName: 'LiftGo',
  manifest: '/manifest.json',        // Next.js generira iz app/manifest.ts
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',  // Full-screen z notch podporo
    title: 'LiftGo',
    // Splash screeni za iOS (generiraj z PWA Asset Generator)
    startupImage: [
      // iPhone 15 Pro Max
      {
        url: '/splash/apple-splash-1290-2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone 14 / 15
      {
        url: '/splash/apple-splash-1179-2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone SE
      {
        url: '/splash/apple-splash-750-1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
      // iPad Pro 12.9"
      {
        url: '/splash/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'sl_SI',
    url: 'https://www.liftgo.net',
    siteName: 'LiftGo',
    title: 'LiftGo — Servis na klik',
    description: 'Poišči in naroči obrtnika za vsako delo.',
    images: [
      {
        url: '/og-image.png',         // 1200x630px
        width: 1200,
        height: 630,
        alt: 'LiftGo — Servis na klik',
      },
    ],
  },

  // Twitter/X Card
  twitter: {
    card: 'summary_large_image',
    title: 'LiftGo — Servis na klik',
    description: 'Poišči in naroči obrtnika za vsako delo.',
    images: ['/og-image.png'],
  },

  // Robots (za strani ki naj bodo indeksirane)
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Ikone
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#4f9eff' },
    ],
  },

  // Microsoft Tiles (Windows)
  other: {
    'msapplication-TileColor': '#4f9eff',
    'msapplication-TileImage': '/icons/icon-144x144.png',
    'msapplication-config': '/browserconfig.xml',
    // Prepreči telefon/email detekcijo ki pokvari layout
    'format-detection': 'telephone=no',
  },
}

// ─── ROOT LAYOUT COMPONENT ────────────────────────────────────────────────
// Primer kako registrirati Service Worker v layout
// Dodaj <ServiceWorkerRegistration /> v svoj <body>


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl">
      <body>
        {children}
        <ServiceWorkerRegistration />   // ← dodaj to
      </body>
    </html>
  )
}
*/

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "LiftGO",
  "legalName": "Liftgo d.o.o.",
  "url": "https://www.liftgo.net",
  "logo": "https://www.liftgo.net/logo.png",
  "foundingDate": "2024",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Kuraltova ulica 12",
    "addressLocality": "Šenčur",
    "postalCode": "4208",
    "addressCountry": "SI"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "info@liftgo.net",
    "contactType": "customer service",
    "availableLanguage": "Slovenian",
    "areaServed": "SI"
  },
  "sameAs": [
    "https://liftgo.net"
  ]
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sl">
      <head>
        <link rel="preload" as="image" href="/images/hero-craftsman.jpg" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <JsonLd data={organizationSchema} />
      </head>
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}>
        {children}
        <CookieConsent />
        <ServiceWorkerRegistration />
        <AgentChatButton />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
