import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { JsonLd } from './components/JsonLd'

import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-dm-sans' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.liftgo.net'),
  title: {
    default: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    template: '%s | LiftGO',
  },
  description: 'Povežemo vas z zanesljivimi preverjenimi obrtniki po vsej Sloveniji. Brezplačno povpraševanje, odziv v 2 urah. 225+ aktivnih mojstrov.',
  keywords: [
    'obrtnik', 'mojster', 'Slovenija', 'vodovodar', 'elektrikar',
    'vodoinstalater', 'mizar', 'Ljubljana', 'Maribor', 'renovacija', 'popravilo', 'LiftGO', 'adaptacije'
  ],
  authors: [{ name: 'LiftGO', url: 'https://www.liftgo.net' }],
  creator: 'LiftGO',
  publisher: 'Liftgo d.o.o.',
  openGraph: {
    title: 'LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah',
    description: 'Oddajte brezplačno povpraševanje in prejmite ponudbo preverjenega obrtnika v manj kot 2 urah.',
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
    description: 'Preverjen obrtnik v manj kot 2 urah. Brezplačno povpraševanje.',
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
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
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
        <JsonLd data={organizationSchema} />
      </head>
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
