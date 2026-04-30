import { getRobotsHeaderValue, isIndexingAllowed, shouldNoindexPath } from '@/lib/seo-indexing'

describe('seo indexing controls', () => {
  it('allows indexing only in Vercel production by default', () => {
    expect(isIndexingAllowed({ VERCEL_ENV: 'production' })).toBe(true)
    expect(isIndexingAllowed({ VERCEL_ENV: 'preview' })).toBe(false)
    expect(isIndexingAllowed({ NODE_ENV: 'production' })).toBe(false)
  })

  it('allows explicit override with ALLOW_INDEXING=true', () => {
    expect(isIndexingAllowed({ VERCEL_ENV: 'preview', ALLOW_INDEXING: 'true' })).toBe(true)
  })

  it('keeps sensitive paths noindex even when indexing is allowed', () => {
    expect(shouldNoindexPath('/admin', true)).toBe(true)
    expect(shouldNoindexPath('/auth/login', true)).toBe(true)
    expect(shouldNoindexPath('/api/health', true)).toBe(true)
    expect(shouldNoindexPath('/', true)).toBe(false)
  })

  it('computes final robots header value', () => {
    expect(getRobotsHeaderValue('/', { VERCEL_ENV: 'production' })).toBeNull()
    expect(getRobotsHeaderValue('/', { VERCEL_ENV: 'preview' })).toBe('noindex, nofollow')
  })
})
