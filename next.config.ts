import type { NextConfig } from 'next'

// Cache bust: 2026-03-23
const nextConfig: NextConfig = {
  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGES - OPTIMIZED
  // ═══════════════════════════════════════════════════════════════════════════
  images: {
    // Podprti formati - AVIF je manjši kot WebP
    formats: ['image/avif', 'image/webp'],
    
    // Dovoli slike iz teh domen
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'whabaeatixtymbccwigu.supabase.co',
      },
    ],
    
    // Device sizes za responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIMENTAL
  // ═══════════════════════════════════════════════════════════════════════════
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    turbopackUseSystemTlsCerts: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TURBOPACK
  // ═══════════════════════════════════════════════════════════════════════════
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REDIRECTS
  // ═══════════════════════════════════════════════════════════════════════════
  async redirects() {
    return [
      {
        source: '/apple-touch-icon.png',
        destination: '/icons/icon-180x180.png',
        permanent: false,
      },
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/icons/icon-180x180.png',
        permanent: false,
      },
      {
        source: '/blog/kako-izbrati-elektroinatalaterja',
        destination: '/blog/kako-izbrati-elektroinatalaterja',
        permanent: false,
      },
      {
        source: '/logo.png',
        destination: '/icons/icon-192x192.png',
        permanent: false,
      },
      {
        source: '/images/og-image.jpg',
        destination: '/icons/icon-512x512.png',
        permanent: false,
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADERS
  // ═══════════════════════════════════════════════════════════════════════════
  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/apple-touch-icon.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: '/_next/image/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

export default nextConfig