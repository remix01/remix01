/**
 * Structured Logger
 * Emits JSON logs for easy parsing and monitoring
 */

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
      ...metadata,
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

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context)
}
