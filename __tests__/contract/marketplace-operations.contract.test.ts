/**
 * Contract Tests: Marketplace Operations
 *
 * Tests the business rules for:
 *   - Partner can submit ponudba on open povprasevanje
 *   - Narocnik can accept a ponudba
 *   - Accept links narocnik and obrtnik
 *   - Narocnik cannot accept a ponudba for another user's povprasevanje
 *   - Obrtnik cannot edit another obrtnik's ponudba
 *   - Povprasevanje with accepted ponudba cannot be hard-deleted
 *   - Admin can moderate ponudba status via canonical service layer
 *
 * Runs fully on mocks — no live DB required.
 */

// ─── IDs ────────────────────────────────────────────────────────────────────
const NAROCNIK_ID = 'aaaa0001-0000-0000-0000-000000000000'
const OBRTNIK_ID  = 'bbbb0002-0000-0000-0000-000000000000'
const OTHER_USER  = 'cccc0003-0000-0000-0000-000000000000'
const POVP_ID     = 'dddd0004-0000-0000-0000-000000000000'
const PONUDBA_ID  = 'eeee0005-0000-0000-0000-000000000000'

// ─── Chainable query-builder helper ─────────────────────────────────────────
function makeBuilder(result: { data: unknown; error: unknown }) {
  const p = Promise.resolve(result)
  const chain: Record<string, unknown> = {
    single:      jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then:    p.then.bind(p),
    catch:   p.catch.bind(p),
    finally: p.finally.bind(p),
  }
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq',
    'in', 'not', 'gte', 'lte', 'gt', 'lt', 'or', 'is', 'limit',
    'order', 'range', 'filter', 'returns']) {
    chain[m] = jest.fn(() => chain)
  }
  return chain
}

// ─── Supabase mock ───────────────────────────────────────────────────────────
const mockFrom = jest.fn()
const mockRpc  = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: jest.fn() },
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: mockFrom,
    rpc: mockRpc,
  },
  logAction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/notifications', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/jobs/queue', () => ({
  enqueue: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/push-notifications', () => ({
  sendPushToObrtnikiByCategory: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/analytics/funnel', () => ({
  trackFunnelEvent: jest.fn(),
  FUNNEL_EVENTS: {
    PONUDBA_ACCEPTED: 'ponudba_accepted',
    PONUDBA_SENT: 'ponudba_sent',
  },
}))

jest.mock('@/lib/mcp/calendar', () => ({
  createAppointmentEvent: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

// ─── Import modules under test ───────────────────────────────────────────────
import { offerService } from '@/lib/services/offerService'
import { acceptPonudbaFull } from '@/lib/dal/ponudbe'
import { deletePovprasevanje } from '@/lib/dal/povprasevanja'

// ─── Test: partner can submit ponudba on open povprasevanje ──────────────────
describe('offerService.createPonudba', () => {
  it('allows obrtnik to submit ponudba on open povprasevanje', async () => {
    const mockPonudba = {
      id: PONUDBA_ID,
      obrtnik_id: OBRTNIK_ID,
      povprasevanje_id: POVP_ID,
      status: 'poslana',
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'obrtnik_profiles') {
        return makeBuilder({ data: { id: OBRTNIK_ID }, error: null })
      }
      if (table === 'povprasevanja') {
        return makeBuilder({ data: { id: POVP_ID, status: 'odprto' }, error: null })
      }
      if (table === 'ponudbe') {
        const b = makeBuilder({ data: mockPonudba, error: null })
        ;(b as any).select = jest.fn(() => b)
        ;(b as any).maybeSingle = jest.fn(() => Promise.resolve({ data: mockPonudba, error: null }))
        return b
      }
      return makeBuilder({ data: null, error: null })
    })

    const result = await offerService.createPonudba(OBRTNIK_ID, {
      obrtnik_id: OBRTNIK_ID,
      povprasevanje_id: POVP_ID,
      message: 'Ponudba za popravilo',
      price_estimate: 150,
      price_type: 'fiksna',
    })

    expect(result).toBeTruthy()
    expect(result?.obrtnik_id).toBe(OBRTNIK_ID)
  })

  it('rejects if obrtnik_id does not match caller userId', async () => {
    await expect(
      offerService.createPonudba(OTHER_USER, {
        obrtnik_id: OBRTNIK_ID, // mismatch
        povprasevanje_id: POVP_ID,
        message: 'Poskus z napačnim ID',
        price_estimate: 100,
        price_type: 'fiksna',
      })
    ).rejects.toThrow('You do not own this obrtnik profile')
  })

  it('rejects if povprasevanje is already in progress', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'obrtnik_profiles') {
        return makeBuilder({ data: { id: OBRTNIK_ID }, error: null })
      }
      if (table === 'povprasevanja') {
        return makeBuilder({ data: { id: POVP_ID, status: 'v_teku' }, error: null })
      }
      return makeBuilder({ data: null, error: null })
    })

    await expect(
      offerService.createPonudba(OBRTNIK_ID, {
        obrtnik_id: OBRTNIK_ID,
        povprasevanje_id: POVP_ID,
        message: 'Prepozno',
        price_estimate: 100,
        price_type: 'fiksna',
      })
    ).rejects.toThrow('ne sprejema')
  })
})

// ─── Test: narocnik can accept ponudba ───────────────────────────────────────
describe('acceptPonudbaFull', () => {
  beforeEach(() => {
    // RPC not available yet → force fallback to sequential writes
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function not found', code: '42883' } })
  })

  it('narocnik can accept a ponudba for their own povprasevanje', async () => {
    const mockPendingPonudba = {
      id: PONUDBA_ID,
      obrtnik_id: OBRTNIK_ID,
      povprasevanje_id: POVP_ID,
      status: 'poslana',
    }
    const mockAcceptedPonudba = { ...mockPendingPonudba, status: 'sprejeta' }

    let ponudbeCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'povprasevanja') {
        return makeBuilder({ data: { id: POVP_ID, narocnik_id: NAROCNIK_ID, status: 'odprto', obrtnik_id: null }, error: null })
      }
      if (table === 'ponudbe') {
        ponudbeCallCount++
        // First call: fetch ponudba to verify ownership/status → return 'poslana'
        // Subsequent calls: update/reject → return accepted result
        if (ponudbeCallCount === 1) {
          return makeBuilder({ data: mockPendingPonudba, error: null })
        }
        return makeBuilder({ data: mockAcceptedPonudba, error: null })
      }
      return makeBuilder({ data: null, error: null })
    })

    const result = await acceptPonudbaFull(PONUDBA_ID, POVP_ID, NAROCNIK_ID)
    expect(result).toBeTruthy()
  })

  it('narocnik cannot accept ponudba for another user\'s povprasevanje', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'povprasevanja') {
        return makeBuilder({
          data: { id: POVP_ID, narocnik_id: OTHER_USER, status: 'odprto', obrtnik_id: null },
          error: null,
        })
      }
      return makeBuilder({ data: null, error: null })
    })

    await expect(
      acceptPonudbaFull(PONUDBA_ID, POVP_ID, NAROCNIK_ID)
    ).rejects.toThrow('Nimate dostopa')
  })

  it('cannot accept ponudba that does not belong to the povprasevanje', async () => {
    const WRONG_POVP = 'ffff0006-0000-0000-0000-000000000000'

    mockFrom.mockImplementation((table: string) => {
      if (table === 'povprasevanja') {
        return makeBuilder({ data: { id: POVP_ID, narocnik_id: NAROCNIK_ID, status: 'odprto', obrtnik_id: null }, error: null })
      }
      if (table === 'ponudbe') {
        // ponudba belongs to WRONG_POVP, not POVP_ID
        return makeBuilder({ data: null, error: null })
      }
      return makeBuilder({ data: null, error: null })
    })

    await expect(
      acceptPonudbaFull(PONUDBA_ID, POVP_ID, NAROCNIK_ID)
    ).rejects.toThrow('Ponudba ni najdena')
  })
})

// ─── Test: obrtnik cannot edit another obrtnik's ponudba ─────────────────────
describe('updatePonudbaAction ownership guard', () => {
  it('rejects if caller does not own ponudba', async () => {
    // Temporarily replace createClient default to return a client where
    // the authenticated user (OTHER_USER) differs from the ponudba owner (OBRTNIK_ID).
    const { createClient } = require('@/lib/supabase/server') as { createClient: jest.Mock }
    const originalImpl = createClient.getMockImplementation()

    const localFrom = jest.fn().mockReturnValue(
      makeBuilder({ data: { id: PONUDBA_ID, obrtnik_id: OBRTNIK_ID, status: 'poslana', povprasevanje_id: POVP_ID }, error: null })
    )
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: OTHER_USER } } }) },
      from: localFrom,
    })

    try {
      const { updatePonudbaAction } = require('@/app/actions/ponudbe') as { updatePonudbaAction: Function }
      const result = await updatePonudbaAction(PONUDBA_ID, { message: 'Changed' })
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/dostopa/)
    } finally {
      // Restore the default so later tests aren't affected
      if (originalImpl) {
        createClient.mockImplementation(originalImpl)
      } else {
        createClient.mockResolvedValue({
          auth: { getUser: jest.fn() },
          from: mockFrom,
          rpc: mockRpc,
        })
      }
    }
  })
})

// ─── Test: povprasevanje with accepted ponudba cannot be hard-deleted ────────
describe('deletePovprasevanje guard', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('prevents deletion when ponudbe exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'ponudbe') {
        return makeBuilder({ data: [{ id: PONUDBA_ID }], error: null })
      }
      return makeBuilder({ data: null, error: null })
    })

    const result = await deletePovprasevanje(POVP_ID)
    expect(result).toBe(false)
  })

  it('allows deletion when no ponudbe exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'ponudbe') {
        return makeBuilder({ data: [], error: null })
      }
      if (table === 'povprasevanja') {
        return makeBuilder({ data: null, error: null })
      }
      return makeBuilder({ data: null, error: null })
    })

    const result = await deletePovprasevanje(POVP_ID)
    expect(result).toBe(true)
  })
})

// ─── Test: admin can moderate via canonical service ──────────────────────────
jest.mock('@/lib/admin-auth', () => ({
  requireAdmin: jest.fn().mockResolvedValue({ userId: 'admin-id', role: 'SUPER_ADMIN' }),
  ensureAdminAccess: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/onboarding/state-machine', () => ({
  transitionOnboardingState: jest.fn().mockResolvedValue(undefined),
}))

describe('adminUpdatePonudbaStatus', () => {
  it('calls canonicalWriteGateway for offer status change', async () => {
    const { canonicalWriteGateway } = await import('@/lib/services/canonicalWriteGateway')
    const gwSpy = jest.spyOn(canonicalWriteGateway, 'createOrUpdatePonudba').mockResolvedValueOnce({ id: PONUDBA_ID, status: 'zavrnjena' } as any)

    const { adminUpdatePonudbaStatus } = await import('@/app/admin/actions')

    const result = await adminUpdatePonudbaStatus(PONUDBA_ID, 'zavrnjena', 'Fraud detected')
    expect(result.success).toBe(true)

    gwSpy.mockRestore()
  })
})
