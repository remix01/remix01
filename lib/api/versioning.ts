/**
 * API Versioning Middleware
 * Handles version extraction and validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_VERSIONS, CURRENT_VERSION, isVersionSupported } from './versions'

export interface ApiVersionOptions {
  minVersion?: string
}

/**
 * Extract API version from request
 * Checks in order: URL path, X-API-Version header, Accept header
 */
export function extractApiVersion(request: NextRequest): string | null {
  // 1. Check URL path: /api/v1/...
  const pathMatch = request.nextUrl.pathname.match(/\/api\/(v\d+)\//)
  if (pathMatch) {
    return pathMatch[1]
  }

  // 2. Check X-API-Version header
  const headerVersion = request.headers.get('X-API-Version')
  if (headerVersion) {
    return headerVersion
  }

  // 3. Check Accept header: application/vnd.liftgo.v1+json
  const acceptHeader = request.headers.get('Accept')
  if (acceptHeader) {
    const acceptMatch = acceptHeader.match(/vnd\.liftgo\.(v\d+)/)
    if (acceptMatch) {
      return acceptMatch[1]
    }
  }

  return null
}

/**
 * Middleware wrapper for API versioning
 * Returns 400 if version is unsupported
 * Adds X-API-Version header to all responses
 */
export function withApiVersion(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: ApiVersionOptions
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const version = extractApiVersion(request) || CURRENT_VERSION

    // Check if version is supported
    if (!isVersionSupported(version)) {
      return NextResponse.json(
        {
          error: 'Nepodprta verzija API',
          code: 'API_VERSION_UNSUPPORTED',
          supported: API_VERSIONS,
          requested: version,
        },
        { status: 400 }
      )
    }

    // Check minimum version requirement
    if (options?.minVersion) {
      const minVersionNum = parseInt(options.minVersion.replace('v', ''))
      const currentVersionNum = parseInt(version.replace('v', ''))
      
      if (currentVersionNum < minVersionNum) {
        return NextResponse.json(
          {
            error: 'Verzija API je prenizka',
            code: 'API_VERSION_TOO_LOW',
            minVersion: options.minVersion,
            requested: version,
          },
          { status: 400 }
        )
      }
    }

    // Call the handler
    const response = await handler(request)

    // Add version header to response
    response.headers.set('X-API-Version', version)

    return response
  }
}
