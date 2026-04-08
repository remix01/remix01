import { RateLimiter } from './rate-limiter'

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

// AI/ML endpoints
export const aiLimiter = new RateLimiter(
  60 * 1000,      // 1 minute
  30,             // 30 requests
  'ai'
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
  payment: paymentLimiter,
  webhook: webhookLimiter,
  bid: bidLimiter,
  email: emailLimiter,
} as const
