describe('QStash production env validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('throws in production when required QStash env vars are missing', async () => {
    (process.env as any).NODE_ENV = 'production'
    delete process.env.QSTASH_TOKEN
    delete process.env.QSTASH_CURRENT_SIGNING_KEY
    delete process.env.QSTASH_NEXT_SIGNING_KEY
    delete process.env.NEXT_PUBLIC_APP_URL

    const { assertQStashProductionEnv } = await import('@/lib/env')

    expect(() => assertQStashProductionEnv()).toThrow(
      '[ENV] Missing required production QStash env vars: QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY, NEXT_PUBLIC_APP_URL'
    )
  })

  it('throws in production when NEXT_PUBLIC_APP_URL is not a valid URL', async () => {
    (process.env as any).NODE_ENV = 'production'
    process.env.QSTASH_TOKEN = 'token'
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current'
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next'
    process.env.NEXT_PUBLIC_APP_URL = 'not-a-url'

    const { assertQStashProductionEnv } = await import('@/lib/env')

    expect(() => assertQStashProductionEnv()).toThrow(
      '[ENV] NEXT_PUBLIC_APP_URL must be a valid http(s) URL in production'
    )
  })

  it('does not throw outside production', async () => {
    (process.env as any).NODE_ENV = 'development'
    delete process.env.QSTASH_TOKEN
    delete process.env.QSTASH_CURRENT_SIGNING_KEY
    delete process.env.QSTASH_NEXT_SIGNING_KEY
    delete process.env.NEXT_PUBLIC_APP_URL

    const { assertQStashProductionEnv } = await import('@/lib/env')

    expect(() => assertQStashProductionEnv()).not.toThrow()
  })
})
