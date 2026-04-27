const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

const POVPR_ROUTE = 'app/api/povprasevanje/route.ts'
const POVPR_PUBLIC_ROUTE = 'app/api/povprasevanje/public/route.ts'
const POVPR_ID_ROUTE = 'app/api/povprasevanje/[id]/route.ts'
const OFFERS_ROUTE = 'app/api/offers/route.ts'
const PONUDBE_ROUTE = 'app/api/ponudbe/route.ts'
const NAROCNIK_REEXPORT = 'app/api/narocnik/povprasevanje/route.ts'
const STRANKA_REEXPORT = 'app/api/stranka/povprasevanje/route.ts'
const NEW_INQUIRY_FORM = 'app/(narocnik)/novo-povprasevanje/page.tsx'
const PWA_DB = 'lib/pwa/db.ts'
const MARKETPLACE_RLS = 'supabase/migrations/20260407_fix_marketplace_rls_and_realtime.sql'

const povprSource = read(POVPR_ROUTE)
const publicSource = read(POVPR_PUBLIC_ROUTE)
const povprIdSource = read(POVPR_ID_ROUTE)
const offersSource = read(OFFERS_ROUTE)
const ponudbeSource = read(PONUDBE_ROUTE)
const narocnikReexportSource = read(NAROCNIK_REEXPORT)
const strankaReexportSource = read(STRANKA_REEXPORT)
const inquiryFormSource = read(NEW_INQUIRY_FORM)
const pwaDbSource = read(PWA_DB)
const rlsSource = read(MARKETPLACE_RLS)

describe('Povprasevanje payload compatibility contract', () => {
  it('accepts and maps modern request fields for authenticated create', () => {
    expect(povprSource).toMatch(/title:\s*z\.string\(\)\.trim\(\)\.min\(2\)\.max\(120\)\.optional\(\)/)
    expect(povprSource).toMatch(/location_city:\s*z\.string\(\)\.trim\(\)\.min\(2\)\.max\(120\)\.optional\(\)/)
    expect(povprSource).toMatch(/description:\s*z\.string\(\)\.trim\(\)\.max\(2000\)\.optional\(\)/)
    expect(povprSource).toMatch(/title,\s*\n\s*location_city:\s*finalLocationCity,\s*\n\s*description:\s*description \|\| null/)
  })

  it('accepts and maps legacy request fields for authenticated create', () => {
    expect(povprSource).toMatch(/storitev:\s*z\.string\(\)\.trim\(\)\.min\(2\)\.max\(120\)\.optional\(\)/)
    expect(povprSource).toMatch(/lokacija:\s*z\.string\(\)\.trim\(\)\.min\(2\)\.max\(120\)\.optional\(\)/)
    expect(povprSource).toMatch(/opis:\s*z\.string\(\)\.trim\(\)\.max\(2000\)\.optional\(\)/)
    expect(povprSource).toMatch(/const titleRaw = safeBody\.title \|\| safeBody\.storitev/)
    expect(povprSource).toMatch(/const locationRaw = safeBody\.location_city \|\| safeBody\.lokacija/)
    expect(povprSource).toMatch(/const descriptionRaw = safeBody\.description \|\| safeBody\.opis/)
  })

  it('keeps response shape for authenticated create locked to { id, status }', () => {
    expect(povprSource).toMatch(/return successResponse\(\{ id: data\.id, status: data\.status \}, 201\)/)
    expect(povprSource).toMatch(/ok:\s*true/)
    expect(povprSource).toMatch(/data:\s*legacy/)
    expect(povprSource).toMatch(/\.\.\.legacy/)
  })
})

describe('Public create fallback insert compatibility contract', () => {
  it('tries modern insert first then falls back to legacy payload on schema mismatch', () => {
    expect(publicSource).toMatch(/const modernInsertData:[\s\S]*title:\s*storitev,[\s\S]*description:\s*opis,[\s\S]*location_city:\s*normalizedLocation/)
    expect(publicSource).toMatch(/const shouldRetryWithLegacySchema =/)
    expect(publicSource).toMatch(/error\.code === 'PGRST204'/)
    expect(publicSource).toMatch(/error\.code === '23514'/)
    expect(publicSource).toMatch(/const legacyInsertData:[\s\S]*storitev,[\s\S]*lokacija:\s*normalizedLocation,[\s\S]*opis:\s*opis \|\| ''/)
    expect(publicSource).toMatch(/status:\s*'novo'/)
  })

  it('keeps response shape for public create locked to { success, id }', () => {
    expect(publicSource).toMatch(/return successResponse\(\{ success: true, id: data\.id \}\)/)
    expect(publicSource).toMatch(/ok:\s*true/)
    expect(publicSource).toMatch(/data:\s*legacy/)
  })

  it('marks legacy fallback with warning and TODO for later cleanup', () => {
    expect(publicSource).toMatch(/\[public\]\[TODO:remove-after-schema-convergence\] Retrying insert with legacy schema payload/)
  })
})

describe('Frontend/PWA field compatibility contract', () => {
  it('modern customer form posts modern fields to /api/povprasevanje', () => {
    expect(inquiryFormSource).toMatch(/fetch\('\/api\/povprasevanje', \{/)
    expect(inquiryFormSource).toMatch(/title,/)
    expect(inquiryFormSource).toMatch(/description,/)
    expect(inquiryFormSource).toMatch(/location_city:\s*locationCity/)
    expect(inquiryFormSource).toMatch(/category_id:\s*selectedCategory\?\.id/)
  })

  it('PWA sync persists legacy-compatible payload flow through /api/povprasevanje/public', () => {
    expect(pwaDbSource).toMatch(/indexedDB\.open\(DB_NAME, DB_VERSION\)/)
    expect(pwaDbSource).toMatch(/objectStore\('pending-submissions'\)\.add\(/)
    expect(pwaDbSource).toMatch(/fetch\('\/api\/povprasevanje\/public', \{/)
  })
})

describe('Auth and ownership contract', () => {
  it('rejects unauthenticated access on protected endpoints', () => {
    expect(povprSource).toMatch(/if \(authError \|\| !user\) \{\s*return errorResponse\('Unauthorized', 401, 'UNAUTHORIZED'\)/)
    expect(offersSource).toMatch(/if \(!user\) \{\s*return errorResponse\('Unauthorized', 401, 'UNAUTHORIZED'\)/)
  })

  it('keeps /api/povprasevanje/[id] as protected admin-only endpoint', () => {
    expect(povprIdSource).toMatch(/const admin = await verifyAdmin\(req\)/)
    expect(povprIdSource).toMatch(/if \(!admin\) return errorResponse\('Unauthorized', 401, 'UNAUTHORIZED'\)/)
    expect(povprIdSource).toMatch(/export async function GET/)
    expect(povprIdSource).toMatch(/export async function PATCH/)
  })

  it('adds canonical error fields while preserving legacy string error', () => {
    expect(povprSource).toMatch(/error:\s*message/)
    expect(povprSource).toMatch(/error_details:\s*\{\s*code,\s*message\s*\}/)
    expect(publicSource).toMatch(/error:\s*message/)
    expect(publicSource).toMatch(/error_details:\s*\{\s*code,\s*message\s*\}/)
    expect(povprIdSource).toMatch(/error:\s*message/)
    expect(povprIdSource).toMatch(/error_details:\s*\{\s*code,\s*message\s*\}/)
  })

  it('documents RLS assumption: owner can select/update own povprasevanja, non-owner denied', () => {
    expect(rlsSource).toMatch(/CREATE POLICY "povprasevanja_select_relevant"/)
    expect(rlsSource).toMatch(/narocnik_id = \(SELECT auth\.uid\(\)\)/)
    expect(rlsSource).toMatch(/CREATE POLICY "povprasevanja_update_owner_or_admin"/)
    expect(rlsSource).toMatch(/WITH CHECK \([\s\S]*narocnik_id = \(SELECT auth\.uid\(\)\)/)
  })
})

describe('Offers and re-export contracts', () => {
  it('locks offers list/create envelope shape', () => {
    expect(offersSource).toMatch(/return successResponse\(offers\)/)
    expect(offersSource).toMatch(/return successResponse\(offer\)/)
    expect(ponudbeSource).toMatch(/return apiSuccess\(ponudba\)/)
  })

  it('keeps narocnik and stranka inquiry endpoints as direct re-exports', () => {
    expect(narocnikReexportSource.trim()).toBe("export { POST, GET } from '@/app/api/povprasevanje/route'")
    expect(strankaReexportSource.trim()).toBe("export { POST, GET } from '@/app/api/povprasevanje/route'")
  })
})
