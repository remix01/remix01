/**
 * Tests that odobriPartnerja sends a profil_verificiran notification exactly once,
 * and that re-approving an already-verified partner does not create a duplicate.
 */

const sendNotificationMock = jest.fn().mockResolvedValue({ success: true })
jest.mock('@/lib/notifications', () => ({
  sendNotification: (...args: any[]) => sendNotificationMock(...args),
}))

const fromMock = jest.fn()
const logActionMock = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: any[]) => fromMock(...args) },
  logAction: (...args: any[]) => logActionMock(...args),
}))

jest.mock('@/lib/admin-auth', () => ({
  requireAdmin: jest.fn().mockResolvedValue({ userId: 'admin-001' }),
}))

jest.mock('@/lib/onboarding/state-machine', () => ({
  transitionOnboardingState: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/services/canonicalWriteGateway', () => ({
  canonicalWriteGateway: {
    updateProviderProfile: jest.fn().mockResolvedValue({ success: true }),
  },
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

jest.mock('@/lib/state/povprasevanja-status', () => ({
  assertPovprasevanjeTransition: jest.fn(),
}))

const PARTNER_ID = 'partner-abc-123'

function buildChainedQuery(result: any) {
  const q: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
  return q
}

describe('odobriPartnerja — partner verification notification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sendNotificationMock.mockResolvedValue({ success: true })
  })

  it('sends profil_verificiran notification when partner transitions from pending to verified', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'obrtnik_profiles') {
        return buildChainedQuery({
          data: { id: PARTNER_ID, verification_status: 'pending', is_verified: false },
          error: null,
        })
      }
      return buildChainedQuery({ data: null, error: null })
    })

    const { odobriPartnerja } = await import('@/app/admin/actions')
    const result = await odobriPartnerja(PARTNER_ID)

    expect(result.success).toBe(true)
    expect(sendNotificationMock).toHaveBeenCalledTimes(1)
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: PARTNER_ID,
        type: 'profil_verificiran',
        link: '/obrtnik/dashboard',
      })
    )
  })

  it('does NOT send a duplicate notification when partner is already verified', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'obrtnik_profiles') {
        return buildChainedQuery({
          data: { id: PARTNER_ID, verification_status: 'verified', is_verified: true },
          error: null,
        })
      }
      return buildChainedQuery({ data: null, error: null })
    })

    const { odobriPartnerja } = await import('@/app/admin/actions')
    const result = await odobriPartnerja(PARTNER_ID)

    expect(result.success).toBe(true)
    expect(sendNotificationMock).not.toHaveBeenCalled()
  })

  it('returns error when partner is not found', async () => {
    fromMock.mockImplementation(() =>
      buildChainedQuery({ data: null, error: null })
    )

    const { odobriPartnerja } = await import('@/app/admin/actions')
    const result = await odobriPartnerja(PARTNER_ID)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/ni bil najden/i)
    expect(sendNotificationMock).not.toHaveBeenCalled()
  })
})
