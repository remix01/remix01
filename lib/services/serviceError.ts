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
      {
        ok: false,
        data: null,
        error: err.message,
        error_details: { code: err.code, message: err.message },
      },
      { status: err.statusCode }
    )
  }

  console.error('[API Error]', err)
  return NextResponse.json(
    {
      ok: false,
      data: null,
      error: 'Internal server error',
      error_details: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
    },
    { status: 500 }
  )
}
