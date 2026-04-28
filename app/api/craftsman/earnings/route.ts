import { ok, fail } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { earningsService, EarningsServiceError } from '@/lib/craftsman/earnings/service'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return fail('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const data = await earningsService.getCraftsmanEarnings(supabase, user.id)
    return ok(data)
  } catch (error) {
    if (error instanceof EarningsServiceError) {
      return fail(error.code, error.message, error.status)
    }

    console.error('Error in earnings API:', error)
    return fail('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
