import { NextResponse } from 'next/server'
import { RateLimiter } from '@/lib/rate-limit/rate-limiter'

export type EmailActionType = 'contact_inquiry' | 'signup_welcome' | 'admin_test'

const TEN_MINUTES = 10 * 60 * 1000

const RATE_LIMIT_RULES: Record<EmailActionType, { ip: number; email?: number; user?: number }> = {
  contact_inquiry: { ip: 3, email: 2, user: 3 },
  signup_welcome: { ip: 5, user: 5 },
  admin_test: { ip: 3, user: 3 },
}

const rateLimiters = {
  contactIp: new RateLimiter(TEN_MINUTES, RATE_LIMIT_RULES.contact_inquiry.ip, 'email:contact:ip'),
  contactEmail: new RateLimiter(TEN_MINUTES, RATE_LIMIT_RULES.contact_inquiry.email ?? 2, 'email:contact:email'),
  contactUser: new RateLimiter(TEN_MINUTES, RATE_LIMIT_RULES.contact_inquiry.user ?? 3, 'email:contact:user'),
  signupIp: new RateLimiter(TEN_MINUTES, RATE_LIMIT_RULES.signup_welcome.ip, 'email:signup:ip'),
  signupUser: new RateLimiter(TEN_MINUTES, RATE_LIMIT_RULES.signup_welcome.user ?? 5, 'email:signup:user'),
  adminIp: new RateLimiter(TEN_MINUTES, RATE_LIMIT_RULES.admin_test.ip, 'email:admin:ip'),
  adminUser: new RateLimiter(TEN_MINUTES, RATE_LIMIT_RULES.admin_test.user ?? 3, 'email:admin:user'),
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'yopmail.com',
])

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) return forwarded.split(',')[0]?.trim() || 'anonymous'
  if (realIp) return realIp.trim()
  return 'anonymous'
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function isDisposableEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  const domain = normalized.split('@')[1]
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}

export function isHoneypotTriggered(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength)
}

export async function checkEmailRateLimit(params: {
  request: Request
  action: EmailActionType
  email?: string | null
  userId?: string | null
}): Promise<
  | { allowed: true }
  | {
      allowed: false
      response: NextResponse
      reason: string
      retryAfter: number
    }
> {
  const { request, action, email, userId } = params
  const ip = getClientIp(request)
  const checkLimiter = async (
    name: string,
    limiter: RateLimiter,
    key: string
  ): Promise<{ blocked: false } | { blocked: true; reason: string; result: Awaited<ReturnType<RateLimiter['check']>> }> => {
    const result = await limiter.check(key)
    if (result.allowed) return { blocked: false }
    return { blocked: true, reason: name, result }
  }

  let blockedResult:
    | { blocked: false }
    | { blocked: true; reason: string; result: Awaited<ReturnType<RateLimiter['check']>> }
    | null = null

  if (action === 'contact_inquiry') {
    blockedResult = await checkLimiter('ip', rateLimiters.contactIp, `ip:${ip}`)
    if (!blockedResult.blocked && email) {
      blockedResult = await checkLimiter(
        'email',
        rateLimiters.contactEmail,
        `email:${email.toLowerCase()}`
      )
    }
    if (!blockedResult.blocked && userId) {
      blockedResult = await checkLimiter('user_id', rateLimiters.contactUser, `user:${userId}`)
    }
  }

  if (action === 'signup_welcome') {
    blockedResult = await checkLimiter('ip', rateLimiters.signupIp, `ip:${ip}`)
    if (!blockedResult.blocked && userId) {
      blockedResult = await checkLimiter('user_id', rateLimiters.signupUser, `user:${userId}`)
    }
  }

  if (action === 'admin_test') {
    blockedResult = await checkLimiter('ip', rateLimiters.adminIp, `ip:${ip}`)
    if (!blockedResult.blocked && userId) {
      blockedResult = await checkLimiter('user_id', rateLimiters.adminUser, `user:${userId}`)
    }
  }

  if (!blockedResult || !blockedResult.blocked) return { allowed: true }

  const retryAfter = Math.max(1, Math.ceil((blockedResult.result.resetAt - Date.now()) / 1000))

  return {
    allowed: false,
    reason: blockedResult.reason,
    retryAfter,
    response: NextResponse.json(
      {
        error: 'Preveč email zahtev. Poskusite znova kasneje.',
        code: 'EMAIL_RATE_LIMITED',
        reason: blockedResult.reason,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(blockedResult.result.limit),
          'X-RateLimit-Remaining': String(blockedResult.result.remaining),
          'X-RateLimit-Reset': new Date(blockedResult.result.resetAt).toISOString(),
        },
      }
    ),
  }
}
