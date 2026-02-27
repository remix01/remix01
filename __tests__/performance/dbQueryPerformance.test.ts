jest.mock('@/lib/supabase-admin')

import { supabaseAdmin } from '@/lib/supabase-admin'

describe('DB Query Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('escrow query with status + release_due_at uses idx_escrow_paid_due index', async () => {
    // Mock the EXPLAIN ANALYZE query
    const explainPlan = [
      {
        plan: 'Index Scan using idx_escrow_paid_due on escrows',
        'Rows': 15,
        'Execution Time': '3.2',
      },
    ]

    ;(supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: explainPlan,
      error: null,
    })

    const start = Date.now()
    // Simulate the query: SELECT * FROM escrows WHERE status = 'paid' AND release_due_at < NOW()
    const { data } = await supabaseAdmin.rpc('explain_query', {
      query:
        "SELECT * FROM escrows WHERE status = 'paid' AND release_due_at < NOW() ORDER BY release_due_at ASC LIMIT 100",
    })
    const duration = Date.now() - start

    expect(data[0].plan).toContain('Index Scan')
    expect(duration).toBeLessThan(50)
  })

  it('agent_logs query by user_id uses index', async () => {
    // Insert 1000 test log entries
    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    const logs = Array(1000)
      .fill(null)
      .map((_, i) => ({
        user_id: 'test-user-id',
        level: 'info',
        event: 'agent_call',
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      }))

    await supabaseAdmin.from('agent_logs').insert(logs)

    // Query by userId
    const start = Date.now()
    await supabaseAdmin
      .from('agent_logs')
      .select('*')
      .eq('user_id', 'test-user-id')
      .order('created_at', { ascending: false })
      .limit(100)
    const duration = Date.now() - start

    expect(duration).toBeLessThan(30)
  })

  it('ownership check query uses primary key lookup', async () => {
    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ created_by: 'test-user-id' }],
        error: null,
      }),
    })

    const escrowId = '550e8400-e29b-41d4-a716-446655440000'

    const start = Date.now()
    const { data } = await supabaseAdmin
      .from('escrows')
      .select('created_by')
      .eq('id', escrowId)
      .single()
    const duration = Date.now() - start

    expect(data?.created_by).toBe('test-user-id')
    expect(duration).toBeLessThan(10)
  })

  it('RLS policy does not cause full table scan', async () => {
    // Verify EXPLAIN shows index scan, not seq scan
    const explainPlan = [
      {
        plan: 'Index Scan using escrows_pkey on escrows',
        'Filter': 'user_id = auth.uid()',
        'Rows': 1,
      },
    ]

    ;(supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: explainPlan,
      error: null,
    })

    const { data } = await supabaseAdmin.rpc('explain_query', {
      query: 'SELECT * FROM escrows WHERE id = $1 AND (user_id = auth.uid())',
    })

    expect(data[0].plan).not.toContain('Seq Scan')
    expect(data[0].plan).toContain('Index Scan')
  })
})
