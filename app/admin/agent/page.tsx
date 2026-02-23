import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

async function getAgentStats() {
  const supabase = await createClient()

  const [
    { count: totalMatches },
    { data: matchesData },
    { count: approvedVerifications },
    { count: pendingVerifications },
    { data: recentMatches },
  ] = await Promise.all([
    supabase
      .from('agent_matches')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('agent_matches')
      .select('score')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'),
    supabase
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('agent_matches')
      .select(`
        id,
        povprasevanje_id,
        povprasevanja:povprasevanja_id(title),
        top_match_id,
        top_match_business_name,
        score,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const avgScore =
    matchesData && matchesData.length > 0
      ? Math.round(
          matchesData.reduce((sum: number, m: any) => sum + (m.score || 0), 0) /
            matchesData.length
        )
      : 0

  return {
    totalMatches: totalMatches || 0,
    avgScore,
    approvedVerifications: approvedVerifications || 0,
    pendingVerifications: pendingVerifications || 0,
    recentMatches: recentMatches || [],
  }
}

export default async function AdminAgentPage() {
  const stats = await getAgentStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Agent — Statistike</h1>
        <p className="mt-2 text-muted-foreground">Pregled delovanja LiftGO AI agenta in verifikacij</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Skupaj matchmaking klicev</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{stats.totalMatches}</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Povprečni score</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{stats.avgScore}</div>
          <div className="mt-1 text-xs text-muted-foreground">od 100</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Verificirani obrtniki</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.approvedVerifications}</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Čakajoče verifikacije</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">{stats.pendingVerifications}</div>
          <Link
            href="/admin/verifikacije"
            className="mt-2 text-xs text-blue-600 hover:underline inline-block"
          >
            Pregled →
          </Link>
        </Card>
      </div>

      {/* Recent Matches Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Zadnjih 10 matchmakingov</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Povpraševanje</th>
                <th className="text-left py-3 px-2 font-medium">Top Match</th>
                <th className="text-left py-3 px-2 font-medium">Score</th>
                <th className="text-left py-3 px-2 font-medium">Datum</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentMatches.map((match: any) => (
                <tr key={match.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 truncate max-w-xs">
                    {match.povprasevanja?.title || 'N/A'}
                  </td>
                  <td className="py-3 px-2 truncate max-w-xs">
                    {match.top_match_business_name || 'N/A'}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        match.score >= 90
                          ? 'bg-green-100 text-green-800'
                          : match.score >= 70
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {match.score}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">
                    {new Date(match.created_at).toLocaleDateString('sl-SI')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
