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
