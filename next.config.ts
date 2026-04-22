import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next'

// Build-time fallbacks for environments where secrets are not injected
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'development-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'development-service-role-key'
process.env.QSTASH_CURRENT_SIGNING_KEY ||= 'development-current-signing-key'
process.env.QSTASH_NEXT_SIGNING_KEY ||= 'development-next-signing-key'
process.env.QSTASH_TOKEN ||= 'development-qstash-token'

// Cache bust: 2026-03-23

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://us.i.posthog.com https://app.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://maps.gstatic.com https://maps.googleapis.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://us.i.posthog.com https://app.posthog.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(https://js.stripe.com)' },
  { key: 'Content-Security-Policy', value: CSP },
]

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
      {
        source: '/:category/:city',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=120' }],
      },
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "liftgo-w5",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Never block deployments because of Sentry auth/project permission issues.
  errorHandler: (error) => {
    console.warn('[Sentry] Non-blocking build warning:', error?.message || error)
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
