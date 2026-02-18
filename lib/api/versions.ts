/**
 * API Version Management
 * Defines supported API versions and validation
 */

export const API_VERSIONS = ['v1'] as const
export type ApiVersion = (typeof API_VERSIONS)[number]

export const CURRENT_VERSION: ApiVersion = 'v1'
export const DEPRECATED_VERSIONS: string[] = []

/**
 * Check if a given version string is supported
 */
export function isVersionSupported(version: string): boolean {
  return API_VERSIONS.includes(version as ApiVersion)
}

/**
 * Check if a version is deprecated
 */
export function isVersionDeprecated(version: string): boolean {
  return DEPRECATED_VERSIONS.includes(version)
}
