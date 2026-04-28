const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

const INDEX_ROUTE = 'app/api/partner/offers/route.ts'
const ID_ROUTE = 'app/api/partner/offers/[id]/route.ts'
const SERVICE = 'lib/partner/offers/service.ts'
const ADAPTER = 'lib/partner/offers/adapter.ts'
const FORM = 'components/partner/offer-form.tsx'
const LIST = 'components/partner/offers-list.tsx'

const indexSource = read(INDEX_ROUTE)
const idSource = read(ID_ROUTE)
const serviceSource = read(SERVICE)
const adapterSource = read(ADAPTER)
const formSource = read(FORM)
const listSource = read(LIST)

describe('Partner offers service-layer contract', () => {
  it('list offers route is present and delegated to service layer', () => {
    expect(indexSource).toMatch(/export async function GET/)
    expect(indexSource).toMatch(/partnerOfferService\.list\(/)
    expect(indexSource).toMatch(/return ok\(offers\)/)
  })

  it('create offer route is delegated to service layer', () => {
    expect(indexSource).toMatch(/export async function POST/)
    expect(indexSource).toMatch(/partnerOfferService\.create\(/)
    expect(indexSource).toMatch(/return ok\(created, undefined, 201\)/)
  })

  it('update offer route is delegated to service layer', () => {
    expect(idSource).toMatch(/export async function PATCH/)
    expect(idSource).toMatch(/partnerOfferService\.update\(/)
    expect(idSource).toMatch(/return ok\(updated\)/)
  })

  it('delete offer route is delegated to service layer', () => {
    expect(idSource).toMatch(/export async function DELETE/)
    expect(idSource).toMatch(/partnerOfferService\.remove\(/)
    expect(idSource).toMatch(/return ok\(result\)/)
  })

  it('unauthorized access returns canonical fail envelope', () => {
    expect(indexSource).toMatch(/fail\('UNAUTHORIZED', 'Unauthorized', 401\)/)
    expect(idSource).toMatch(/fail\('UNAUTHORIZED', 'Unauthorized', 401\)/)
  })

  it('forbidden non-owner checks are enforced in service update/delete paths', () => {
    expect(serviceSource).toMatch(/currentOffer\.obrtnik_id !== userId/)
    expect(serviceSource).toMatch(/new PartnerOfferServiceError\('FORBIDDEN', 'Nimate dostopa do te ponudbe\.', 403\)/)
  })

  it('normalized DTO adapter is present and used by service', () => {
    expect(adapterSource).toMatch(/export function toOfferDto/)
    expect(serviceSource).toMatch(/map\(toOfferDto\)/)
    expect(serviceSource).toMatch(/return toOfferDto\(data\)/)
  })

  it('frontend keeps compatibility with canonical error shape', () => {
    expect(formSource).toMatch(/typeof result\?\.error === 'string'/)
    expect(listSource).toMatch(/result\?\.error\?\.message/)
  })
})
