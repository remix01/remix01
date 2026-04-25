import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getProblematicniUporabniki,
  setUserRole,
  createObrtnikProfile,
} from '../actions'
import { ProblematicniPanel } from './ProblematicniPanel'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

async function getDataQualityStats() {
  await requireAdmin()
  const staleDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [profiles, staleInquiries, incompleteCraftworkers] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, email, full_name').limit(4000),
    supabaseAdmin
      .from('povprasevanja')
      .select('id, title, created_at, status')
      .lt('created_at', staleDate)
      .neq('status', 'zakljuceno')
      .limit(100),
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, logo_url')
      .or('business_name.is.null,logo_url.is.null')
      .limit(100),
  ])

  const emailMap: Record<string, any[]> = {}
  for (const p of profiles.data || []) {
    if (p.email) emailMap[p.email] = [...(emailMap[p.email] || []), p]
  }
  const duplicateUsers = Object.values(emailMap).filter((rows) => rows.length > 1).flat()

  return {
    duplicateUsers,
    incompleteCraftworkers: incompleteCraftworkers.data || [],
    staleInquiries: staleInquiries.data || [],
  }
}

export default async function DataQualityPage() {
  const [{ nullRoleUsers, obrtnikiBrezProfila }, stats] = await Promise.all([
    getProblematicniUporabniki(),
    getDataQualityStats(),
  ])

  const criticalCount = nullRoleUsers.length + obrtnikiBrezProfila.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kakovost podatkov</h1>
        <p className="text-muted-foreground">Zaznaj in popravi težave v bazi</p>
      </div>

      {criticalCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            {criticalCount} kritičnih težav — popravi jih spodaj
          </p>
        </div>
      )}

      <ProblematicniPanel
        nullRoleUsers={nullRoleUsers}
        obrtnikiBrezProfila={obrtnikiBrezProfila}
        setUserRole={setUserRole}
        createObrtnikProfile={createObrtnikProfile}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Podvojeni profili</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.duplicateUsers.length === 0 ? (
              <p className="text-muted-foreground">Ni podvojenih.</p>
            ) : (
              stats.duplicateUsers.slice(0, 10).map((u: any) => (
                <div key={u.id} className="rounded border p-2">
                  <p className="font-medium">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nepopolni obrtnik profili</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.incompleteCraftworkers.length === 0 ? (
              <p className="text-muted-foreground">Ni nepopolnih.</p>
            ) : (
              stats.incompleteCraftworkers.slice(0, 10).map((u: any) => (
                <div key={u.id} className="rounded border p-2">
                  <p className="font-medium">{u.business_name || u.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {!u.business_name && 'Manjka ime podjetja. '}
                    {!u.logo_url && 'Manjka logotip.'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stara povpraševanja (&gt;90 dni)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.staleInquiries.length === 0 ? (
              <p className="text-muted-foreground">Ni starih povpraševanj.</p>
            ) : (
              stats.staleInquiries.slice(0, 10).map((i: any) => (
                <div key={i.id} className="rounded border p-2">
                  <p className="font-medium">{i.title || i.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(i.created_at).toLocaleDateString('sl-SI')} · {i.status}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
