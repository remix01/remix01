/**
 * Long-Term Memory — Persistent per-user agent state stored in Supabase
 *
 * Schema: agent_user_memory
 *   user_id         UUID PRIMARY KEY
 *   preferences     JSONB   — user-stated preferences (location, budget range, etc.)
 *   recent_activity JSONB   — last N tool calls across all sessions
 *   summary         TEXT    — AI-generated one-paragraph digest of history
 *   updated_at      TIMESTAMPTZ
 *
 * This module is called:
 *   - LOAD  at the start of orchestrate() to inject persistent context into the system prompt
 *   - FLUSH after a successful tool call to persist what just happened
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  tool: string
  resourceId?: string
  timestamp: number
  success: boolean
}

export interface LongTermMemoryRecord {
  userId: string
  preferences: Record<string, unknown>
  recentActivity: ActivityEntry[]
  summary: string | null
  updatedAt: string
}

const MAX_ACTIVITY_ENTRIES = 30

// ── READ ──────────────────────────────────────────────────────────────────────

/**
 * Load long-term memory for a user.
 * Returns null if no row exists yet (first-time user).
 * Never throws — failures are logged and swallowed so the agent stays available.
 */
export async function loadLongTermMemory(
  userId: string
): Promise<LongTermMemoryRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_user_memory')
      .select('user_id, preferences, recent_activity, summary, updated_at')
      .eq('user_id', userId)
      .single()

    if (error) {
      // PGRST116 = row not found — expected for new users
      if (error.code !== 'PGRST116') {
        console.error('[LONG-TERM MEMORY] Load error:', error.message)
      }
      return null
    }

    return {
      userId: data.user_id,
      preferences: (data.preferences as Record<string, unknown>) ?? {},
      recentActivity: (data.recent_activity as ActivityEntry[]) ?? [],
      summary: data.summary ?? null,
      updatedAt: data.updated_at,
    }
  } catch (err) {
    console.error('[LONG-TERM MEMORY] Unexpected load error:', err)
    return null
  }
}

// ── WRITE ─────────────────────────────────────────────────────────────────────

/**
 * Append a tool call result to the user's activity log and upsert the row.
 * Called after each successful tool execution so the agent builds history
 * over time without requiring explicit session management.
 */
export async function appendActivity(
  userId: string,
  entry: ActivityEntry
): Promise<void> {
  try {
    // Read existing row first so we can append rather than overwrite
    const existing = await loadLongTermMemory(userId)

    const currentActivity: ActivityEntry[] = existing?.recentActivity ?? []
    const currentPreferences: Record<string, unknown> =
      existing?.preferences ?? {}

    // Prepend new entry and keep only the most recent MAX_ACTIVITY_ENTRIES
    const updatedActivity: ActivityEntry[] = [entry, ...currentActivity].slice(
      0,
      MAX_ACTIVITY_ENTRIES
    )

    const { error } = await supabaseAdmin
      .from('agent_user_memory')
      .upsert(
        {
          user_id: userId,
          preferences: currentPreferences,
          recent_activity: updatedActivity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('[LONG-TERM MEMORY] Append activity error:', error.message)
    }
  } catch (err) {
    console.error('[LONG-TERM MEMORY] Unexpected append error:', err)
  }
}

/**
 * Persist a user preference extracted from conversation.
 * Merged with existing preferences so keys not mentioned are preserved.
 *
 * Example: mergePreferences(userId, { location: 'Ljubljana', budget: 500 })
 */
export async function mergePreferences(
  userId: string,
  updates: Record<string, unknown>
): Promise<void> {
  try {
    const existing = await loadLongTermMemory(userId)
    const merged = { ...(existing?.preferences ?? {}), ...updates }

    const { error } = await supabaseAdmin
      .from('agent_user_memory')
      .upsert(
        {
          user_id: userId,
          preferences: merged,
          recent_activity: existing?.recentActivity ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('[LONG-TERM MEMORY] Merge preferences error:', error.message)
    }
  } catch (err) {
    console.error('[LONG-TERM MEMORY] Unexpected merge error:', err)
  }
}

/**
 * Overwrite the AI-generated summary for a user.
 * Call this after a session ends to condense the conversation into a
 * compact paragraph that fits cheaply into future system prompts.
 */
export async function updateSummary(
  userId: string,
  summary: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('agent_user_memory')
      .upsert(
        {
          user_id: userId,
          summary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('[LONG-TERM MEMORY] Update summary error:', error.message)
    }
  } catch (err) {
    console.error('[LONG-TERM MEMORY] Unexpected summary error:', err)
  }
}

// ── FORMAT FOR SYSTEM PROMPT ──────────────────────────────────────────────────

/**
 * Return a compact, token-efficient string to inject into the LLM system prompt.
 * Returns an empty string for new users so the prompt stays clean.
 */
export function formatForSystemPrompt(
  mem: LongTermMemoryRecord | null
): string {
  if (!mem) return ''

  const lines: string[] = []

  if (mem.summary) {
    lines.push(`USER HISTORY SUMMARY: ${mem.summary}`)
  }

  const prefKeys = Object.keys(mem.preferences)
  if (prefKeys.length > 0) {
    const prefStr = prefKeys
      .map(k => `${k}=${JSON.stringify(mem.preferences[k])}`)
      .join(', ')
    lines.push(`USER PREFERENCES: ${prefStr}`)
  }

  const last3 = mem.recentActivity.slice(0, 3)
  if (last3.length > 0) {
    const actStr = last3
      .map(a => `${a.tool}${a.resourceId ? `(${a.resourceId})` : ''}`)
      .join(' → ')
    lines.push(`RECENT ACTIONS: ${actStr}`)
  }

  return lines.join('\n')
}
