export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context: string
  requestId?: string
  userId?: string
  [key: string]: unknown
}

const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'secret', 'token', 'accessToken', 'refreshToken',
  'access_token', 'refresh_token', 'apiKey', 'api_key', 'serviceRoleKey',
  'service_role_key', 'authorization', 'cookie', 'sessionId', 'session_id',
  'cardNumber', 'card_number', 'cvv', 'cvc', 'ssn', 'taxNumber', 'tax_number',
  'phone', 'email', 'customerEmail', 'customer_email', 'stripeSecretKey',
  'stripe_secret_key', 'webhookSecret', 'webhook_secret', 'signingSecret',
  'signing_secret', 'privateKey', 'private_key',
])

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(v => redact(v, depth + 1))
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k) ? '[REDACTED]' : redact(v, depth + 1),
    ])
  )
}

export class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      ...(metadata ? redact(metadata) as Record<string, unknown> : {}),
    }

    const logFn = level === 'error' ? console.error :
                  level === 'warn' ? console.warn :
                  console.log

    logFn(JSON.stringify(entry))
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, metadata)
    }
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata)
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata)
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata)
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context)
}
