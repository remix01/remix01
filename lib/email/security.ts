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

  const checks: Array<{ name: string; result: Awaited<ReturnType<RateLimiter['check']>> }> = []

  if (action === 'contact_inquiry') {
    checks.push({ name: 'ip', result: await rateLimiters.contactIp.check(`ip:${ip}`) })
    if (email) checks.push({ name: 'email', result: await rateLimiters.contactEmail.check(`email:${email.toLowerCase()}`) })
    if (userId) checks.push({ name: 'user_id', result: await rateLimiters.contactUser.check(`user:${userId}`) })
  }

  if (action === 'signup_welcome') {
    checks.push({ name: 'ip', result: await rateLimiters.signupIp.check(`ip:${ip}`) })
    if (userId) checks.push({ name: 'user_id', result: await rateLimiters.signupUser.check(`user:${userId}`) })
  }

  if (action === 'admin_test') {
    checks.push({ name: 'ip', result: await rateLimiters.adminIp.check(`ip:${ip}`) })
    if (userId) checks.push({ name: 'user_id', result: await rateLimiters.adminUser.check(`user:${userId}`) })
  }

  const blocked = checks.find((check) => !check.result.allowed)
  if (!blocked) return { allowed: true }

  const retryAfter = Math.max(1, Math.ceil((blocked.result.resetAt - Date.now()) / 1000))

  return {
    allowed: false,
    reason: blocked.name,
    retryAfter,
    response: NextResponse.json(
      {
        error: 'Preveč email zahtev. Poskusite znova kasneje.',
        code: 'EMAIL_RATE_LIMITED',
        reason: blocked.name,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(blocked.result.limit),
          'X-RateLimit-Remaining': String(blocked.result.remaining),
          'X-RateLimit-Reset': new Date(blocked.result.resetAt).toISOString(),
        },
      }
    ),
  }
}
