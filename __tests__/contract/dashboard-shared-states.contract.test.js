const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const files = {
  header: 'components/dashboard/DashboardPageHeader.tsx',
  empty: 'components/dashboard/EmptyState.tsx',
  error: 'components/dashboard/ErrorState.tsx',
  loading: 'components/dashboard/LoadingState.tsx',
  denied: 'components/dashboard/PermissionDeniedState.tsx',
  adminError: 'app/admin/error.tsx',
  partnerjiError: 'app/admin/partnerji/error.tsx',
  strankeError: 'app/admin/stranke/error.tsx',
  roleGuard: 'components/admin/RoleGuard.tsx',
}

const source = Object.fromEntries(
  Object.entries(files).map(([k, file]) => [k, fs.readFileSync(path.join(process.cwd(), file), 'utf8')])
)

describe('Dashboard shared states contract', () => {
  it('defines the required shared dashboard components', () => {
    expect(source.header).toMatch(/export function DashboardPageHeader/)
    expect(source.empty).toMatch(/export function EmptyState/)
    expect(source.error).toMatch(/export function ErrorState/)
    expect(source.loading).toMatch(/export function LoadingState/)
    expect(source.denied).toMatch(/export function PermissionDeniedState/)
  })

  it('keeps admin error pages wired to shared ErrorState component', () => {
    expect(source.adminError).toMatch(/from '\@\/components\/dashboard\/ErrorState'/)
    expect(source.adminError).toMatch(/<ErrorState/)

    expect(source.partnerjiError).toMatch(/from '\@\/components\/dashboard\/ErrorState'/)
    expect(source.partnerjiError).toMatch(/<ErrorState/)

    expect(source.strankeError).toMatch(/from '\@\/components\/dashboard\/ErrorState'/)
    expect(source.strankeError).toMatch(/<ErrorState/)
  })

  it('uses shared PermissionDeniedState in admin RoleGuard fallback', () => {
    expect(source.roleGuard).toMatch(/from '\@\/components\/dashboard\/PermissionDeniedState'/)
    expect(source.roleGuard).toMatch(/<PermissionDeniedState/)
  })
})
