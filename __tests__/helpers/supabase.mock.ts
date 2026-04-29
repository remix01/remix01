import { jest } from '@jest/globals'

/**
 * Creates a chainable Supabase query builder mock.
 *
 * Supports both `await query` and `await query.maybeSingle()` terminations,
 * matching how the real Supabase JS client works.
 */
export function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> & {
    maybeSingle: ReturnType<typeof jest.fn>
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => Promise<unknown>
    catch: (onRejected: (e: unknown) => unknown) => Promise<unknown>
    finally: (onFinally: () => void) => Promise<unknown>
  } = {
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
    catch(onRejected: any) {
      return Promise.resolve(result).catch(onRejected)
    },
    finally(onFinally: any) {
      return Promise.resolve(result).finally(onFinally)
    },
    maybeSingle: jest.fn().mockResolvedValue(result),
  } as any

  for (const method of [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'not',
    'lte', 'gte', 'lt', 'gt',
    'or', 'ilike',
    'order', 'limit', 'range',
  ]) {
    chain[method] = jest.fn().mockReturnValue(chain)
  }

  return chain
}

export type SupabaseChain = ReturnType<typeof makeChain>

/**
 * Builds a mock Supabase client.
 *
 * `fromImpl` receives the table name and returns a chain. Use
 * `jest.fn().mockReturnValueOnce(...)` calls to sequence different results
 * when the same table is queried more than once in a single function.
 */
export function makeSupabaseClient(fromImpl?: (table: string) => SupabaseChain) {
  const defaultFrom = (_table: string) => makeChain({ data: null, error: null })
  return {
    from: jest.fn().mockImplementation(fromImpl ?? defaultFrom),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  }
}
