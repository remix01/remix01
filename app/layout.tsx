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

// ─── VIEWPORT ────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  // FIX 1: maximumScale: 1 + userScalable: false blokirata zoom —
  // Google to kaznuje pri Core Web Vitals (Accessibility) in PWA auditu.
  // Dovoli zoom za dostopnost (WCAG 2.1 AA zahteva).
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    // FIX 2: En sam themeColor ne pokriva light/dark mode.
    // Brskalnik prikaže pravilno barvo glede na OS temo.
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  // FIX 3: viewportFit: 'cover' — podpora za iPhone notch /
  // Dynamic Island. Brez tega se vsebina ne razpne do roba zaslona.
  viewportFit: 'cover',
}

// ─── METADATA ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL('https://www.liftgo.net'),
  title: {
    default: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    template: '%s | LiftGO',
  },
  description: 'Povežemo vas z zanesljivimi preverjenimi obrtniki po vsej Sloveniji. Brezplačno povpraševanje, odziv v 24 urah. 225+ aktivnih mojstrov.',
  keywords: [
    'obrtnik', 'mojster', 'Slovenija', 'vodovodar', 'elektrikar', 'parketar', 'malar',
    'vodoinstalater', 'mizar', 'Ljubljana', 'Maribor', 'renovacija', 'popravilo', 'LiftGO', 'adaptacije',
  ],
  authors: [{ name: 'LiftGO', url: 'https://www.liftgo.net' }],
  creator: 'LiftGO',
  publisher: 'Liftgo d.o.o.',
  // FIX 4: applicationName je obvezno za PWA — brskalnik ga uporabi
  // v install promptu in v app switcher-ju na Androidu.
  applicationName: 'LiftGO',

  // ─── Open Graph ───────────────────────────────────────────────────────
  openGraph: {
    title: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    description: 'Oddajte brezplačno povpraševanje in prejmite ponudbo preverjenega obrtnika v manj kot 24 urah.',
    // FIX 5: url je bil 'https://liftgo.net' (brez www) — neskladnost
    // s metadataBase in canonical. Mora biti konsistentno www.
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

  // ─── Twitter / X ──────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    description: 'Preverjen obrtnik v manj kot 24 urah. Brezplačno povpraševanje.',
    images: ['/images/og-image.jpg'],
    // FIX 6: Dodaj site handle če obstaja Twitter/X račun
    // site: '@liftgo_si',
  },

  // ─── Robots ───────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,  // FIX 7: manjkal max-video-preview
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ─── Canonical ────────────────────────────────────────────────────────
  alternates: {
    canonical: 'https://www.liftgo.net',
  },

  // ─── PWA manifest ─────────────────────────────────────────────────────
  // Next.js generira /manifest.json iz app/manifest.ts
  manifest: '/manifest.json',

  // ─── Apple / iOS PWA ──────────────────────────────────────────────────
  appleWebApp: {
    capable: true,
    // FIX 8: 'black-translucent' razpne vsebino pod status bar —
    // idealno za full-screen PWA z notch podporo (skupaj z viewportFit: 'cover')
    statusBarStyle: 'black-translucent',
    title: 'LiftGO',
    // FIX 9: Dodani iOS splash screeni — brez tega iOS prikaže
    // bel/črn flash ob zagonu nameščene PWA.
    // Generiraj slike z: npx pwa-asset-generator logo.png public/splash
    startupImage: [
      // iPhone 15 Pro Max (430pt)
      {
        url: '/splash/apple-splash-1290-2796.png',
        media:
          '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 15 / 14 Pro (393pt)
      {
        url: '/splash/apple-splash-1179-2556.png',
        media:
          '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 14 / 13 / 12 (390pt)
      {
        url: '/splash/apple-splash-1170-2532.png',
        media:
          '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone SE 3rd gen / 8 (375pt)
      {
        url: '/splash/apple-splash-750-1334.png',
        media:
          '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 12.9"
      {
        url: '/splash/apple-splash-2048-2732.png',
        media:
          '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 11" / iPad Air
      {
        url: '/splash/apple-splash-1668-2388.png',
        media:
          '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },

  // ─── Ikone ────────────────────────────────────────────────────────────
  icons: {
    icon: [
      // FIX 10: Dodane ikone v različnih velikostih — samo favicon.ico
      // ni dovolj (manjka za Android, PWA, browser tabs v visokih resolucijah)
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      // SVG ikona — najboljša kvaliteta, vektorska (Chrome 93+)
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      // FIX 11: apple-touch-icon mora biti točno 180x180 za iOS home screen
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      // Safari pinned tab ikona (monochrome SVG)
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#0f172a' },
    ],
  },

  // ─── Ostalo ───────────────────────────────────────────────────────────
  other: {
    // FIX 12: Windows tile konfiguracija
    'msapplication-TileColor': '#0f172a',
    'msapplication-TileImage': '/icons/icon-144x144.png',
    // FIX 13: Prepreči samodejno formatiranje telefonskih številk
    // ki pokvari layout na iOS
    'format-detection': 'telephone=no',
  },
}

// ─── SCHEMA.ORG ──────────────────────────────────────────────────────────────
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'LiftGO',
  legalName: 'Liftgo d.o.o.',
  url: 'https://www.liftgo.net',
  logo: {
    // FIX 14: logo mora biti ImageObject z dimenzijami za Google Knowledge Panel
    '@type': 'ImageObject',
    url: 'https://www.liftgo.net/logo.png',
    width: 512,
    height: 512,
  },
  foundingDate: '2024',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Kuraltova ulica 12',
    addressLocality: 'Šenčur',
    postalCode: '4208',
    addressCountry: 'SI',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@liftgo.net',
    contactType: 'customer service',
    availableLanguage: 'Slovenian',
    areaServed: 'SI',
  },
  // FIX 15: sameAs je bil samo liftgo.net — dodaj vse
  // kanonične URL-je in socialne profile
  sameAs: [
    'https://liftgo.net',
    'https://www.liftgo.net',
    // 'https://www.facebook.com/liftgo',   // dodaj ko obstaja
    // 'https://www.linkedin.com/company/liftgo',
  ],
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
        {/* FIX 16: Preload kritičnih virov za LCP (hero slika) */}
        <link rel="preload" as="image" href="/images/hero-craftsman.jpg" fetchPriority="high" />

        {/* FIX 17: apple-touch-icon je duplikat — že definiran v metadata.icons.
            Ohranjen je samo za starejše iOS (<6) ki ne berejo <meta> tagov.
            Zamenjaj s pravilno ikono — mora biti točno /apple-touch-icon.png */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* FIX 18: apple-mobile-web-app-capable in mobile-web-app-capable
            sta DUPLIKATI — Next.js ju že generira iz appleWebApp: { capable: true }.
            Odstranjeni iz <head> da ni dvojnih tagov v HTML-ju. */}

        {/* JSON-LD structured data */}
        <JsonLd data={organizationSchema} />
      </head>
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}>
        {children}
        <CookieConsent />
        {/* ServiceWorker — registrira SW po page load, ne blokira renderiranja */}
        <ServiceWorkerRegistration />
        <AgentChatButton />

        {/* Google Analytics — afterInteractive, ne vpliva na LCP */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{anonymize_ip:true});`}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}