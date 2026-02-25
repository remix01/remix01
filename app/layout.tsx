import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import Script from 'next/script'
import { JsonLd } from './components/JsonLd'
import { CookieConsent } from '@/components/cookie-consent'
import { ServiceWorkerRegistration } from '@/components/liftgo/ServiceWorkerRegistration'

import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-dm-sans' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
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
  authors: [{ name: 'LiftGO', url: 'https://www.liftgo.net' }],
  creator: 'LiftGO',
  publisher: 'Liftgo d.o.o.',
  openGraph: {
    title: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    description: 'Oddajte brezplačno povpraševanje in prejmite ponudbo preverjenega obrtnika v manj kot 24 urah.',
    url: 'https://liftgo.net',
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
  twitter: {
    card: 'summary_large_image',
    title: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    description: 'Preverjen obrtnik v manj kot 24 urah. Brezplačno povpraševanje.',
    images: ['/images/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://www.liftgo.net',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LiftGO',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

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
