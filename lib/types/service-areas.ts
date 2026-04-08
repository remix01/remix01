/**
 * Service Areas Type Definitions
 * SINGLE SOURCE OF TRUTH - Do not create duplicate types elsewhere
 */

// Database row (matches Supabase schema)
export interface ServiceAreaRow {
  id: string
  obrtnik_id: string
  city: string
  region: string | null
  radius_km: number | null
  lat: number | null
  lng: number | null
  is_active: boolean | null
  created_at: string | null
}

// For display components (CoverageTab, ProfileTabs)
export interface ServiceAreaDisplay {
  id: string
  city: string
  region: string | null
  radius_km: number
}

// For forms
export interface ServiceAreaFormData {
  city: string
  radius_km: number
  region: string
}

// For API inputs
export interface ServiceAreaInput {
  city: string
  region?: string
  radius_km?: number
}

// Defaults - use these instead of hardcoding
export const SERVICE_AREA_DEFAULTS = {
  region: 'Slovenija',
  radius_km: 25,
  is_active: true,
} as const

// Transform DB row to display type
export function toServiceAreaDisplay(row: ServiceAreaRow): ServiceAreaDisplay {
  return {
    id: row.id,
    city: row.city,
    region: row.region,
    radius_km: row.radius_km ?? SERVICE_AREA_DEFAULTS.radius_km,
  }
}

// Transform array of DB rows
export function toServiceAreaDisplayList(
  rows: ServiceAreaRow[] | null
): ServiceAreaDisplay[] {
  return (rows ?? []).map(toServiceAreaDisplay)
}
