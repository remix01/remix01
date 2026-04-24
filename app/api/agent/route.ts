import { fail } from '@/lib/http/response'

/**
 * POST /api/agent
 *
 * DEPRECATED: Use /api/agent/chat instead
 *
 * This route is kept for backward compatibility but redirects to the new endpoint.
 * The chat UI (useAgentChat.ts) uses /api/agent/chat directly.
 */
export async function POST() {
  return fail('Use /api/agent/chat instead. This endpoint is deprecated.', 308)
}
