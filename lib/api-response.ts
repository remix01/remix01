/**
 * Standardized API response utilities
 * All API routes should use these for consistent response formats
 */

import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Return successful response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true, data },
    { status }
  )
}

/**
 * Return error response
 */
export function apiError(error: string, status: number = 400): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, error },
    { status }
  )
}

/**
 * 400 Bad Request - validation errors or invalid input
 */
export function badRequest(error: string): NextResponse<ApiErrorResponse> {
  return apiError(error, 400)
}

/**
 * 401 Unauthorized - missing or invalid session
 */
export function unauthorized(error: string = 'Unauthorized'): NextResponse<ApiErrorResponse> {
  return apiError(error, 401)
}

/**
 * 403 Forbidden - authenticated but not allowed
 */
export function forbidden(error: string = 'Access denied'): NextResponse<ApiErrorResponse> {
  return apiError(error, 403)
}

/**
 * 404 Not Found
 */
export function notFound(error: string = 'Resource not found'): NextResponse<ApiErrorResponse> {
  return apiError(error, 404)
}

/**
 * 409 Conflict - duplicate resource
 */
export function conflict(error: string): NextResponse<ApiErrorResponse> {
  return apiError(error, 409)
}

/**
 * 429 Too Many Requests - rate limit
 */
export function tooManyRequests(error: string): NextResponse<ApiErrorResponse> {
  return apiError(error, 429)
}

/**
 * 500 Internal Server Error - genuine server errors only
 */
export function internalError(error: string = 'Internal server error'): NextResponse<ApiErrorResponse> {
  return apiError(error, 500)
}
