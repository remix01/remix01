import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, getIdentifier } from './rate-limiter'

/**
 * Pre-configured rate limiters for different API endpoints
 * These are singleton instances that can be imported and used in route handlers
 */

// Authentication endpoints (login, register, password reset)
export const authLimiter = new RateLimiter(
  15 * 60 * 1000, // 15 minutes
  10,             // 10 requests
  'auth'
)

// Inquiry creation (prevent spam)
export const inquiryLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  5,              // 5 requests
  'inquiry'
)

// Offer submission
export const offerLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  20,             // 20 requests
  'offer'
)

// General API calls
export const apiLimiter = new RateLimiter(
  60 * 1000,      // 1 minute
  100,            // 100 requests
  'api'
)

// File uploads
export const uploadLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  20,             // 20 requests
  'upload'
)

// Search/listing endpoints
export const searchLimiter = new RateLimiter(
  60 * 1000,      // 1 minute
  60,             // 60 requests
  'search'
)

// AI/ML endpoints (per-endpoint)
export const aiLimiter = new RateLimiter(
  60 * 1000,      // 1 minute
  30,             // 30 requests
  'ai'
)

// Global AI rate limiter for unauthenticated users (IP-based)
export const aiGuestLimiter = new RateLimiter(
  60 * 1000,      // 1 minute
  20,             // 20 requests per minute for guests
  'ai-guest'
)

// Global AI rate limiter for authenticated users
export const aiAuthLimiter = new RateLimiter(
  60 * 1000,      // 1 minute
  100,            // 100 requests per minute for authenticated users
  'ai-auth'
)

// Payment/checkout endpoints
export const paymentLimiter = new RateLimiter(
  60 * 1000,      // 1 minute
  10,             // 10 requests
  'payment'
)

// Webhook processing
export const webhookLimiter = new RateLimiter(
  60 * 1000,      // 1 minute
  1000,           // High limit for webhook delivery
  'webhook'
)

// Bid/quote submission
export const bidLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  50,             // 50 requests
  'bid'
)

// Email operations (password reset, verification, etc)
export const emailLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  5,              // 5 requests
  'email'
)

// Export all limiters as a registry for easier management
export const RATE_LIMITERS = {
  auth: authLimiter,
  inquiry: inquiryLimiter,
  offer: offerLimiter,
  api: apiLimiter,
  upload: uploadLimiter,
  search: searchLimiter,
  ai: aiLimiter,
  aiGuest: aiGuestLimiter,
  aiAuth: aiAuthLimiter,
  payment: paymentLimiter,
  webhook: webhookLimiter,
  bid: bidLimiter,
  email: emailLimiter,
} as const

/**
 * Check global AI rate limit for a request.
 * Uses different limits for guest (IP-based) vs authenticated users.
 * Returns null if allowed, or a 429 NextResponse if rate-limited.
 *
 * Accepts both NextRequest and plain Request (some routes use Request).
 */
export async function checkAIRateLimit(
  request: NextRequest | Request,
  userId?: string | null
): Promise<NextResponse | null> {
  const limiter = userId ? aiAuthLimiter : aiGuestLimiter

  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  let identifier: string
  if (userId) {
    identifier = `user:${userId}`
  } else if (forwarded) {
    identifier = `ip:${forwarded.split(',')[0].trim()}`
  } else if (realIp) {
    identifier = `ip:${realIp}`
  } else {
    identifier = 'ip:anonymous'
  }

  const result = await limiter.check(identifier)

  if (!result.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Preveč zahtevkov. Poskusite ponovno čez minuto.',
        canonical_error: {
          code: 'RATE_LIMITED',
          message: 'Too many AI requests',
          details: {
            limit: result.limit,
            remaining: result.remaining,
            resetAt: new Date(result.resetAt).toISOString(),
          },
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
        },
      }
    )
  }

  return null
}
