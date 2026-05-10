jest.mock('@/lib/env', () => ({
  env: {
    RESEND_API_KEY: '',
    EMAIL_FROM: 'LiftGO <noreply@liftgo.net>',
    DEFAULT_FROM_EMAIL: '',
    RESEND_FROM: '',
    EMAIL_DEV_REDIRECT_TO: '',
    EMAIL_ALLOWED_RECIPIENTS: '',
  },
}))

describe('resend sender formatting', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('extracts email from formatted sender values', async () => {
    const { extractEmailAddress } = await import('@/lib/resend')

    expect(extractEmailAddress('LiftGO <noreply@liftgo.net>')).toBe('noreply@liftgo.net')
    expect(extractEmailAddress('noreply@liftgo.net')).toBe('noreply@liftgo.net')
  })

  it('builds valid alert from field even when EMAIL_FROM is already formatted', async () => {
    const { getDefaultFrom } = await import('@/lib/resend')

    expect(getDefaultFrom('LiftGO Alerts')).toBe('LiftGO Alerts <noreply@liftgo.net>')
  })
})
