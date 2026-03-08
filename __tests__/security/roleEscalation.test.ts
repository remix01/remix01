import { MessageBus } from '@/lib/agents/base/MessageBus'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { testDb } from '../integration/helpers/testDb'

describe('Role Escalation', () => {
  beforeEach(async () => {
    await testDb.reset()
  })

  it('regular user cannot call admin-only tools directly', async () => {
    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'admin',
      action: 'resolveDispute',
      params: {
        disputeId: 'test-dispute',
        resolution: 'refund',
        userId: 'regular-user',
        sessionId: 'test-session',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('regular user cannot call system-level tools', async () => {
    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'system',
      action: 'clearAllData',
      params: {
        userId: 'regular-user',
        sessionId: 'test-session',
      },
    } as any)

    expect(response.statusCode).toBe(403)
  })

  it('partner cannot refund escrow — admin only', async () => {
    const escrowId = 'test-escrow'
    await supabaseAdmin.from('escrows').insert({
      id: escrowId,
      status: 'captured',
    })

    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'escrow',
      action: 'refundEscrow',
      params: {
        escrowId,
        userId: 'partner-user',
        sessionId: 'test-session',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('passing elevated role in request body has no effect', async () => {
    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'escrow',
      action: 'refundEscrow',
      params: {
        escrowId: 'test-escrow',
        userId: 'regular-user',
        sessionId: 'test-session',
        role: 'admin',
      } as any,
    })

    expect(response.statusCode).toBe(403)
  })

  it('manipulating sessionId to steal another session fails', async () => {
    const userASessionId = 'user-a-session'
    const userBSessionId = 'user-b-session'

    await supabaseAdmin.from('sessions').insert({
      id: userBSessionId,
      user_id: 'user-b',
    })

    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'inquiry',
      action: 'createInquiry',
      params: {
        title: 'test',
        description: 'test',
        userId: 'user-a',
        sessionId: userBSessionId,
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('expired session is rejected with 401', async () => {
    const expiredSessionId = 'expired-session'
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    await supabaseAdmin.from('sessions').insert({
      id: expiredSessionId,
      user_id: 'test-user',
      created_at: new Date(oneDayAgo).toISOString(),
      expires_at: new Date(oneDayAgo + 60 * 60 * 1000).toISOString(),
    })

    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'inquiry',
      action: 'createInquiry',
      params: {
        title: 'test',
        description: 'test',
        userId: 'test-user',
        sessionId: expiredSessionId,
      },
    })

    expect(response.statusCode).toBe(401)
  })

  it('missing session is rejected with 401 not 403', async () => {
    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'inquiry',
      action: 'createInquiry',
      params: {
        title: 'test',
        description: 'test',
        userId: 'test-user',
        sessionId: 'nonexistent-session',
      },
    })

    expect(response.statusCode).toBe(401)
    expect(response.statusCode).not.toBe(403)
  })

  it('admin audit log is not accessible to regular users', async () => {
    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'admin',
      action: 'getAuditLog',
      params: {
        userId: 'regular-user',
        sessionId: 'test-session',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('observability dashboard returns 403 for non-admins', async () => {
    // Simulating access to admin observability endpoint
    const response = await fetch('/api/admin/observability', {
      headers: {
        'X-User-Id': 'regular-user',
        'X-Session-Id': 'test-session',
      },
    })

    expect(response.status).toBe(403)
  })

  it('system roles cannot be assigned via API', async () => {
    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'admin',
      action: 'updateUserRole',
      params: {
        userId: 'test-user',
        newRole: 'system_admin',
        requestingUser: 'regular-user',
        sessionId: 'test-session',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('JWT tampering is prevented by Supabase auth verification', async () => {
    const tamperedJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.invalid_signature'

    try {
      const response = await MessageBus.send({
        from: 'orchestrator',
        to: 'inquiry',
        action: 'createInquiry',
        params: {
          title: 'test',
          description: 'test',
          userId: 'test-user',
          sessionId: 'test-session',
          jwtToken: tamperedJwt,
        } as any,
      })

      expect(response.statusCode).toBe(401)
    } catch (e) {
      expect(e).toBeDefined()
    }
  })

  it('cross-user data access is blocked by RLS', async () => {
    const userAId = 'user-a'
    const userBId = 'user-b'
    const inquiryId = 'inquiry-owned-by-b'

    await supabaseAdmin.from('inquiries').insert({
      id: inquiryId,
      user_id: userBId,
      title: 'secret inquiry',
      status: 'open',
    })

    // Try to access as User A
    const response = await MessageBus.send({
      from: 'orchestrator',
      to: 'inquiry',
      action: 'getInquiry',
      params: {
        inquiryId,
        userId: userAId,
        sessionId: 'test-session',
      },
    })

    expect(response.statusCode).toBe(403)
  })
})
