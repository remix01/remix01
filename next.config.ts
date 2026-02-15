import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Disable body parsing for Stripe webhook to allow raw body access
  async rewrites() {
    return []
  },
}

export default nextConfig
