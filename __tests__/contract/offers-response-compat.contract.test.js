const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

const OFFERS_ROUTE = 'app/api/offers/route.ts'
const PONUDBE_ROUTE = 'app/api/ponudbe/route.ts'
const OFFER_SERVICE = 'lib/services/offerService.ts'
const API_RESPONSE = 'lib/api-response.ts'
const SERVICE_ERROR = 'lib/services/serviceError.ts'

const offersSource = read(OFFERS_ROUTE)
const ponudbeSource = read(PONUDBE_ROUTE)
const offerServiceSource = read(OFFER_SERVICE)
const apiResponseSource = read(API_RESPONSE)
const serviceErrorSource = read(SERVICE_ERROR)

describe('Offers API compatibility contract', () => {
  it('GET /api/offers keeps list success shape and adds canonical compatibility', () => {
    expect(offersSource).toMatch(/export async function GET/)
    expect(offersSource).toMatch(/return successResponse\(offers\)/)
    expect(offersSource).toMatch(/ok:\s*true/)
    expect(offersSource).toMatch(/success:\s*true/)
    expect(offersSource).toMatch(/data,/)
  })

  it('POST /api/offers keeps create success shape and adds canonical compatibility', () => {
    expect(offersSource).toMatch(/export async function POST/)
    expect(offersSource).toMatch(/return successResponse\(offer\)/)
    expect(offersSource).toMatch(/ok:\s*true/)
    expect(offersSource).toMatch(/success:\s*true/)
    expect(offersSource).toMatch(/data,/)
  })

  it('unauthorized access is denied with legacy + canonical error envelope', () => {
    expect(offersSource).toMatch(/if \(!user\) \{\s*return errorResponse\('Unauthorized', 401, 'UNAUTHORIZED'\)/)
    expect(offersSource).toMatch(/success:\s*false/)
    expect(offersSource).toMatch(/error_details:\s*\{ code, message \}/)
  })

  it('service-layer errors preserve legacy string error and add canonical error structure', () => {
    expect(serviceErrorSource).toMatch(/ok:\s*false/)
    expect(serviceErrorSource).toMatch(/data:\s*null/)
    expect(serviceErrorSource).toMatch(/error:\s*err\.message/)
    expect(serviceErrorSource).toMatch(/error_details:\s*\{ code: err\.code, message: err\.message \}/)
  })
})

describe('Ponudbe endpoint compatibility contract', () => {
  it('POST /api/ponudbe keeps apiSuccess path and adds canonical compatibility via helper', () => {
    expect(ponudbeSource).toMatch(/return apiSuccess\(ponudba\)/)
    expect(apiResponseSource).toMatch(/\{ ok: true, success: true, data \}/)
  })

  it('apiError helper keeps legacy error while adding canonical error fields', () => {
    expect(apiResponseSource).toMatch(/success:\s*false/)
    expect(apiResponseSource).toMatch(/error,/)
    expect(apiResponseSource).toMatch(/ok:\s*false/)
    expect(apiResponseSource).toMatch(/data:\s*null/)
    expect(apiResponseSource).toMatch(/error_details:\s*\{ code, message: error \}/)
  })
})

describe('Ownership and non-owner denial contract', () => {
  it('createOffer enforces request ownership and denies non-owners', () => {
    expect(offerServiceSource).toMatch(/if \(!inquiry \|\| inquiry\.narocnik_id !== userId\)/)
    expect(offerServiceSource).toMatch(/'Unauthorized - you do not own this request'/)
    expect(offerServiceSource).toMatch(/'FORBIDDEN'/)
    expect(offerServiceSource).toMatch(/403/)
  })

  it('createPonudba enforces obrtnik profile ownership and denies non-owners', () => {
    expect(offerServiceSource).toMatch(/\.eq\('user_id', userId\)/)
    expect(offerServiceSource).toMatch(/'You do not own this obrtnik profile'/)
    expect(offerServiceSource).toMatch(/'FORBIDDEN'/)
    expect(offerServiceSource).toMatch(/403/)
  })
})
