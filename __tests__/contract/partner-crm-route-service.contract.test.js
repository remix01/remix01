const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

const ROUTE = 'app/api/partner/crm/route.ts'
const SERVICE = 'lib/partner/crm/service.ts'
const ADAPTER = 'lib/partner/crm/adapter.ts'
const TYPES = 'lib/partner/crm/types.ts'
const PAGE = 'app/partner-dashboard/crm/page.tsx'

const routeSource = read(ROUTE)
const serviceSource = read(SERVICE)
const adapterSource = read(ADAPTER)
const typesSource = read(TYPES)
const pageSource = read(PAGE)

describe('Partner CRM route/service contract', () => {
  it('success response uses canonical ok() and delegates business logic to shared service', () => {
    expect(routeSource).toMatch(/import \{ ok, fail \} from ['"]@\/lib\/api\/response['"]/)
    expect(routeSource).toMatch(/partnerCRMService\.getCRMData\(/)
    expect(routeSource).toMatch(/return ok\(data\)/)
  })

  it('unauthorized response returns canonical fail envelope', () => {
    expect(routeSource).toMatch(/if \(!user\) return fail\('UNAUTHORIZED', 'Unauthorized', 401\)/)
  })

  it('tier denied behavior is preserved in service with same semantic (crm feature required)', () => {
    expect(serviceSource).toMatch(/canAccessFeature\(profile\?\.subscription_tier, 'crm'\)/)
    expect(serviceSource).toMatch(/new PartnerCRMServiceError\('TIER_REQUIRED', 'PRO paket obvezen\.', 403\)/)
  })

  it('crm DTO/types are explicit and adapter normalizes API shape', () => {
    expect(typesSource).toMatch(/export interface CRMData/)
    expect(typesSource).toMatch(/export interface CRMStats/)
    expect(adapterSource).toMatch(/export function toCRMData/)
    expect(adapterSource).toMatch(/buildCRMStats/)
    expect(adapterSource).toMatch(/buildCRMPipeline/)
    expect(adapterSource).toMatch(/buildCRMRecentActivity/)
  })

  it('frontend keeps compatibility with canonical and legacy response markers', () => {
    expect(pageSource).toMatch(/if \(json\?\.ok \|\| json\?\.success\) setData\(json\.data\)/)
  })
})
