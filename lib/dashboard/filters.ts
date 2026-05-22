import { isCanonicalLeadStatus, toCanonicalLeadStatus, type CanonicalLeadStatus } from '@/lib/lead-status'

export const DASHBOARD_DATE_RANGES = ['7d', '30d', '90d', 'custom'] as const
export type DashboardDateRange = (typeof DASHBOARD_DATE_RANGES)[number]

export interface DashboardFilters {
  dateRange: DashboardDateRange
  status?: CanonicalLeadStatus
  category?: string
  location?: string
}

export type DashboardFilterInput = Record<string, string | string[] | undefined> | URLSearchParams

export function getDefaultDashboardFilters(): DashboardFilters {
  return { dateRange: '7d' }
}

function readParam(input: DashboardFilterInput, key: string): string | undefined {
  const value = input instanceof URLSearchParams ? input.get(key) : input[key]
  if (Array.isArray(value)) return value[0]
  if (typeof value === 'string') return value
  return undefined
}

export function normalizeDashboardStatus(status?: string | null): CanonicalLeadStatus | undefined {
  if (!status) return undefined
  const trimmed = status.trim().toLowerCase()
  if (!trimmed) return undefined
  if (isCanonicalLeadStatus(trimmed)) return trimmed
  return toCanonicalLeadStatus(trimmed)
}

export function parseDashboardFilters(input: DashboardFilterInput): DashboardFilters {
  const defaults = getDefaultDashboardFilters()
  const dateRangeRaw = readParam(input, 'dateRange')?.toLowerCase()
  const dateRange = (dateRangeRaw && (DASHBOARD_DATE_RANGES as readonly string[]).includes(dateRangeRaw))
    ? (dateRangeRaw as DashboardDateRange)
    : defaults.dateRange

  const status = normalizeDashboardStatus(readParam(input, 'status'))
  const categoryRaw = readParam(input, 'category')?.trim()
  const locationRaw = readParam(input, 'location')?.trim()

  return {
    dateRange,
    status,
    category: categoryRaw || undefined,
    location: locationRaw || undefined,
  }
}

export function serializeDashboardFilters(filters: DashboardFilters): string {
  const params = new URLSearchParams()
  params.set('dateRange', filters.dateRange || '7d')
  if (filters.status) params.set('status', filters.status)
  if (filters.category) params.set('category', filters.category)
  if (filters.location) params.set('location', filters.location)
  return params.toString()
}
