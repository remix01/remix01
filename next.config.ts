import type { NextConfig } from 'next'

// Cache bust: 2026-03-15
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
  },

  // Merged: All redirects in single function to avoid duplicate key issues
  async redirects() {
    return [
      // Apple touch icon redirects
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
      // Blog and asset redirects
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
  
}

export default nextConfig
