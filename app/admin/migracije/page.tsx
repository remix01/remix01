import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MigratePartnerAction } from '@/components/admin/MigratePartnerAction'
import { MigrateAllPartnersAction } from '@/components/admin/MigrateAllPartnersAction'

async function getMigrationStats() {
  const supabase = await createClient()

  const [
    { count: totalNonMigrated },
    { count: totalMigrated },
    { data: nonMigratedPartners }
  ] = await Promise.all([
    supabase
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .is('new_profile_id', null),
    supabase
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .not('new_profile_id', 'is', null),
    supabase
      .from('partners')
      .select('id, business_name, email, city, created_at, rating, is_verified')
      .is('new_profile_id', null)
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  return {
    totalNonMigrated: totalNonMigrated || 0,
    totalMigrated: totalMigrated || 0,
    nonMigratedPartners: nonMigratedPartners || []
  }
}

export default async function MigracijePage() {
  // Check admin access is handled in layout.tsx
  const stats = await getMigrationStats()

  const migrationPercentage = stats.totalMigrated + stats.totalNonMigrated > 0
    ? Math.round((stats.totalMigrated / (stats.totalMigrated + stats.totalNonMigrated)) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Migracija partnerjev</h1>
        <p className="text-muted-foreground mt-1">
          Povežite stare partnerje s novim sistemom obrtnik_profiles
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Čakajočih na migracijo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNonMigrated}</div>
            <p className="text-xs text-muted-foreground mt-1">
              partnerjev brez novi profil
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Že migrirani
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMigrated}</div>
            <p className="text-xs text-muted-foreground mt-1">
              uspešno povezanih partnerjev
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Napredek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{migrationPercentage}%</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${migrationPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Akcije</CardTitle>
          <CardDescription>
            Migrirajte partnerje individualno ali v skupinah
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.totalNonMigrated > 0 && (
            <MigrateAllPartnersAction
              totalNonMigrated={stats.totalNonMigrated}
            />
          )}
        </CardContent>
      </Card>

      {/* Non-migrated Partners Table */}
      {stats.nonMigratedPartners.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Zadnjih 20 partnerjev, ki čakajo na migracijo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime poslovanja</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mesto</TableHead>
                  <TableHead>Ocena</TableHead>
                  <TableHead>Verificirano</TableHead>
                  <TableHead>Datum registracije</TableHead>
                  <TableHead className="text-right">Akcija</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.nonMigratedPartners.map((partner: any) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">
                      {partner.business_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {partner.email}
                    </TableCell>
                    <TableCell>
                      {partner.city || '-'}
                    </TableCell>
                    <TableCell>
                      {partner.rating ? `${partner.rating.toFixed(1)}/5` : '-'}
                    </TableCell>
                    <TableCell>
                      {partner.is_verified ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ✓ Da
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Ne
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(partner.created_at).toLocaleDateString('sl-SI')}
                    </TableCell>
                    <TableCell className="text-right">
                      <MigratePartnerAction partnerId={partner.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              ✓ Vsi partnerji so že migrirani v novi sistem!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
