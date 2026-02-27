import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import Script from 'next/script'
import { env } from '@/lib/env'
import { JsonLd } from './components/JsonLd'
import { CookieConsent } from '@/components/cookie-consent'
import { ServiceWorkerRegistration } from '@/components/liftgo/ServiceWorkerRegistration'
import { AgentChatButton } from '@/components/agent/AgentChatButton'

import './globals.css'

// ─── FONTI ───────────────────────────────────────────────────────────────────
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  // FIX 1: display: 'swap' prepreči FOIT (Flash of Invisible Text)
  // in izboljša LCP score
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// ─── VIEWPORT ────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  // FIX 2: userScalable: false + maximumScale: 1 blokirata zoom —
  // Lighthouse Accessibility penalizira, WCAG 2.1 AA zahteva zoom.
  maximumScale: 5,
  userScalable: true,
  // FIX 3: Ločen light/dark themeColor — prej je bil samo #0f172a
  // kar je prikazovalo temen status bar tudi v light modu
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  // FIX 4: viewportFit: 'cover' — razpne vsebino pod iPhone notch
  // in Dynamic Island. Obvezno za profesionalen PWA videz na iOS.
  viewportFit: 'cover',
}

// ─── METADATA ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL('https://www.liftgo.net'),

  title: {
    default: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    template: '%s | LiftGO',
  },
  description:
    'Povežemo vas z zanesljivimi preverjenimi obrtniki po vsej Sloveniji. Brezplačno povpraševanje, odziv v 24 urah. 225+ aktivnih mojstrov.',
  keywords: [
    'obrtnik', 'mojster', 'Slovenija', 'vodovodar', 'elektrikar',
    'parketar', 'malar', 'vodoinstalater', 'mizar', 'Ljubljana',
    'Maribor', 'renovacija', 'popravilo', 'LiftGO', 'adaptacije',
  ],
  authors: [{ name: 'LiftGO', url: 'https://www.liftgo.net' }],
  creator: 'LiftGO',
  publisher: 'Liftgo d.o.o.',
  // FIX 5: applicationName — obvezno za PWA install prompt in
  // Android app switcher
  applicationName: 'LiftGO',

  // ─── Open Graph ─────────────────────────────────────────────────────────
  openGraph: {
    title: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    description:
      'Oddajte brezplačno povpraševanje in prejmite ponudbo preverjenega obrtnika v manj kot 24 urah.',
    // FIX 6: url je bil 'https://liftgo.net' brez www —
    // neskladnost s canonical in metadataBase
    url: 'https://www.liftgo.net',
    siteName: 'LiftGO',
    locale: 'sl_SI',
    type: 'website',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'LiftGO — Platforma za iskanje obrtnikov v Sloveniji',
      },
    ],
  },

  // ─── Twitter / X ────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    description: 'Preverjen obrtnik v manj kot 24 urah. Brezplačno povpraševanje.',
    images: ['/images/og-image.jpg'],
  },

  // ─── Robots ─────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // FIX 7: Dodan max-video-preview ki je manjkal
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ─── Canonical ──────────────────────────────────────────────────────────
  alternates: {
    canonical: 'https://www.liftgo.net',
  },

  // ─── PWA ────────────────────────────────────────────────────────────────
  manifest: '/manifest.json',

  // ─── Apple PWA ──────────────────────────────────────────────────────────
  appleWebApp: {
    capable: true,
    // FIX 8: black-translucent razpne vsebino pod status bar —
    // skupaj z viewportFit: 'cover' daje pravi full-screen PWA videz
    statusBarStyle: 'black-translucent',
    title: 'LiftGO',
    // FIX 9: iOS splash screeni — brez tega iOS prikaže bel flash
    // pri zagonu nameščene PWA. Generiraj z:
    // npx pwa-asset-generator public/icons/icon.svg public/splash --splash-only
    startupImage: [
      // iPhone 15 Pro Max
      {
        url: '/splash/apple-splash-1290-2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 15 / 14 Pro
      {
        url: '/splash/apple-splash-1179-2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 14 / 13 / 12
      {
        url: '/splash/apple-splash-1170-2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone SE
      {
        url: '/splash/apple-splash-750-1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 12.9"
      {
        url: '/splash/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 11" / Air
      {
        url: '/splash/apple-splash-1668-2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },

  // ─── Ikone ──────────────────────────────────────────────────────────────
  icons: {
    icon: [
      // FIX 10: Samo favicon.ico ni dovolj — manjkale vse velikosti
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#0f172a' },
    ],
  },

  // ─── Ostalo ─────────────────────────────────────────────────────────────
  other: {
    'msapplication-TileColor': '#0f172a',
    'msapplication-TileImage': '/icons/icon-144x144.png',
    // FIX 11: Prepreči iOS samodejno formatiranje telefonskih številk
    'format-detection': 'telephone=no',
  },
}

// ─── SCHEMA.ORG ──────────────────────────────────────────────────────────────
// FIX 12: Več schema tipov za boljše Google rich results:
// Organization + WebSite (SiteLinksSearchBox) + LocalBusiness

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  name: 'LiftGO',
  legalName: 'Liftgo d.o.o.',
  url: 'https://www.liftgo.net',
  // FIX 13: logo kot ImageObject z dimenzijami — Google Knowledge Panel zahteva
  logo: {
    '@type': 'ImageObject',
    url: 'https://www.liftgo.net/logo.png',
    width: 512,
    height: 512,
  },
  image: 'https://www.liftgo.net/images/og-image.jpg',
  description: 'Platforma za iskanje zanesljivih preverjenjih obrtnikov po vsej Sloveniji.',
  foundingDate: '2024',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Kuraltova ulica 12',
    addressLocality: 'Šenčur',
    postalCode: '4208',
    addressCountry: 'SI',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 46.2437,
    longitude: 14.4191,
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@liftgo.net',
    contactType: 'customer service',
    availableLanguage: 'Slovenian',
    areaServed: 'SI',
  },
  sameAs: [
    'https://liftgo.net',
    'https://www.liftgo.net',
  ],
}

// FIX 14: WebSite schema z SearchAction — Google SiteLinks search box
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'LiftGO',
  url: 'https://www.liftgo.net',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.liftgo.net/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

// ─── ROOT LAYOUT ─────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sl">
      <head>
        {/* FIX 15: fetchPriority="high" za LCP sliko — brskalnik jo
            naloži takoj, ne čaka na CSS/JS parse */}
        <link
          rel="preload"
          as="image"
          href="/images/hero-craftsman.jpg"
          // @ts-expect-error — fetchPriority je veljaven HTML atribut
          fetchPriority="high"
        />

        {/* apple-touch-icon — za starejše iOS (<6) ki ne berejo <meta> tagov.
            Nove verzije iOS že berejo metadata.icons.apple zgoraj. */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* FIX 16: apple-mobile-web-app-capable in mobile-web-app-capable
            sta bila v originalu ročno dodana — Next.js ju že generira
            iz appleWebApp: { capable: true }. Odstranjeni — bili so duplicate. */}

        {/* JSON-LD — Organization + LocalBusiness */}
        <JsonLd data={organizationSchema} />
        {/* JSON-LD — WebSite + SearchAction */}
        <JsonLd data={websiteSchema} />
      </head>

      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}>
        {children}

        <CookieConsent />

        {/* SW registracija — po page load, ne blokira renderiranja */}
        <ServiceWorkerRegistration />

        {/* Chat — prikaže se samo avtenticiranim uporabnikom */}
        <AgentChatButton />

        {/* Google Analytics — afterInteractive, ne vpliva na LCP/FID */}
        {env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${env.NEXT_PUBLIC_GA_ID}',{anonymize_ip:true,cookie_flags:'SameSite=None;Secure'});`}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
