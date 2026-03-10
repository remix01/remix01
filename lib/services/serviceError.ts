import { NextResponse } from 'next/server'

export type ServiceErrorCode = 
  | 'NOT_FOUND' 
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN'
  | 'VALIDATION' 
  | 'DB_ERROR'
  | 'RATE_LIMIT'
  | 'CONFLICT'

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public statusCode: number
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

/**
 * Helper to convert ServiceError to NextResponse
 * Use in route.ts for consistent error handling
 */
export function handleServiceError(err: unknown): NextResponse {
  if (err instanceof ServiceError) {
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode }
    )
  }

  console.error('[API Error]', err)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
