import { supabaseAdmin } from '@/lib/supabase-admin'
import { AIAnalyticsDashboard } from './AIAnalyticsDashboard'

export const metadata = { title: 'AI Analytics | Admin' }
export const revalidate = 300 // refresh every 5 minutes

async function getAnalyticsData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [dailyResult, modelResult, topUsersResult, summaryResult] = await Promise.all([
    // Daily usage by model (last 7 days)
    supabaseAdmin
      .from('ai_usage_logs')
      .select('created_at, model_used, cost_usd, tokens_input, tokens_output, response_cached')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true }),

    // Model distribution (last 24h)
    supabaseAdmin
      .from('ai_usage_logs')
      .select('model_used')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

    // Top users by message count (last 7 days)
    supabaseAdmin
      .from('ai_usage_logs')
      .select('user_id, cost_usd')
      .gte('created_at', sevenDaysAgo),

    // Summary stats
    supabaseAdmin
      .from('ai_usage_logs')
      .select('cost_usd, response_cached, model_used')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])

  return {
    rawLogs: dailyResult.data ?? [],
    modelLogs24h: modelResult.data ?? [],
    userLogs7d: topUsersResult.data ?? [],
    summaryLogs24h: summaryResult.data ?? [],
  }
}

export default async function AIAnalyticsPage() {
  const data = await getAnalyticsData()
  return <AIAnalyticsDashboard data={data} />
}
