import { GET } from '@/app/api/admin/stats/route'

jest.mock('@/lib/supabase-admin', () => ({
  verifyAdmin: jest.fn(async () => null),
  supabaseAdmin: {},
}))

describe('admin stats envelope', () => {
  it('returns standardized envelope on unauthorized', async () => {
    const response = await GET(new Request('http://localhost/api/admin/stats'))
    const json = await response.json()
    expect(json).toHaveProperty('success', false)
    expect(json).toHaveProperty('data', null)
    expect(json).toHaveProperty('error')
    expect(json).toHaveProperty('correlationId')
  })
})
