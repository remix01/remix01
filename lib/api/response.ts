/**
 * Standardized API Response Helpers
 * Provides consistent response format across all API endpoints
 * 
 * USAGE EXAMPLE (opt-in for existing routes):
 * 
 * import { withApiVersion } from '@/lib/api/versioning'
 * import { withRequestLogger } from '@/lib/logger/request-logger'
 * import { apiSuccess, apiError } from '@/lib/api/response'
 * 
 * export const GET = withRequestLogger(withApiVersion(async (req) => {
 *   try {
 *     const data = await fetchData()
 *     return apiSuccess(data)
 *   } catch (error) {
 *     return apiError('Napaka pri pridobivanju podatkov', 'FETCH_ERROR', 500)
 *   }
 * }))
 */

import { NextResponse } from 'next/server'
import { CURRENT_VERSION } from './versions'

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  meta: {
    version: string
    requestId?: string
    timestamp: string
  }
}

export interface ApiErrorResponse {
  success: false
  error: string
  code: string
  details?: unknown
  meta: {
    version: string
    requestId?: string
    timestamp: string
  }
}

export interface ApiPaginatedResponse<T = unknown> {
  success: true
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasMore: boolean
  }
  meta: {
    version: string
    requestId?: string
    timestamp: string
  }
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  status = 200,
  requestId?: string
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      version: CURRENT_VERSION,
      requestId,
      timestamp: new Date().toISOString(),
    },
  }

  return NextResponse.json(response, { status })
}

/**
 * Create an error API response
 */
export function apiError(
  message: string,
  code: string,
  status = 500,
  details?: unknown,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
    code,
    details,
    meta: {
      version: CURRENT_VERSION,
      requestId,
      timestamp: new Date().toISOString(),
    },
  }

  return NextResponse.json(response, { status })
}

/**
 * Create a paginated API response
 */
export function apiPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  requestId?: string
): NextResponse<ApiPaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit)
  const hasMore = page < totalPages

  const response: ApiPaginatedResponse<T> = {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore,
    },
    meta: {
      version: CURRENT_VERSION,
      requestId,
      timestamp: new Date().toISOString(),
    },
  }

  return NextResponse.json(response, { status: 200 })
}
