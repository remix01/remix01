import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Reads daily AI usage from both sources and returns the stricter (larger) value.
 *
 * Source A: `ai_usage_logs` — row count for today (canonical for detailed telemetry)
 * Source B: `profiles.ai_messages_used_today` — legacy counter (read by ai-security-middleware)
 *
 * During the migration period both systems may drift. Using the max
 * of both prevents over-granting quota when one system lags behind.
 *
 * Race-condition note: both reads are eventually-consistent. An atomic
 * Supabase RPC would be ideal but is not available without a migration.
 */
export async function getDailyUsageStrict(
  userId: string,
  agentType?: string
): Promise<{ used: number; sourceA: number; sourceB: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [logsResult, profileResult] = await Promise.all([
    supabaseAdmin
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .then((r) => r.count ?? 0),
    supabaseAdmin
      .from('profiles')
      .select('ai_messages_used_today')
      .eq('id', userId)
      .single()
      .then((r) => r.data?.ai_messages_used_today ?? 0),
  ])

  const sourceA = logsResult
  const sourceB = profileResult
  return { used: Math.max(sourceA, sourceB), sourceA, sourceB }
}

/**
 * Synchronises the profile counter to match the ai_usage_logs count.
 * Call after a successful AI telemetry write to keep both systems aligned.
 *
 * This is a best-effort operation — failures are logged but never thrown.
 */
export async function syncProfileCounter(userId: string): Promise<void> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())

    if (count != null) {
      await supabaseAdmin
        .from('profiles')
        .update({ ai_messages_used_today: count })
        .eq('id', userId)
    }
  } catch (err) {
    console.error(
      '[quota-compat] Failed to sync profile counter (non-fatal):',
      err instanceof Error ? err.message : err
    )
  }
}
