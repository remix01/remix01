import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { AlertTriangle, RefreshCw } from 'lucide-react'

async function getMigrationStats() {
  try {
    const supabase = await createClient()

    // Test if columns exist first
    const { data: testData, error: testError } = await supabase
      .from('partners')
      .select('new_profile_id, migrated_at')
      .limit(1)

    if (testError) {
      console.error('[v0] Column test error:', testError)
      throw new Error('Migration columns may not exist yet')
    }

    const [
      { count: totalNonMigrated, error: nonMigratedError },
      { count: totalMigrated, error: migratedError },
      { data: nonMigratedPartners, error: partnersError }
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
        .select('id, company_name, email, created_at')
        .is('new_profile_id', null)
        .order('created_at', { ascending: false })
        .limit(20)
    ])

    if (nonMigratedError) {
      console.error('[v0] Non-migrated count error:', nonMigratedError)
      throw nonMigratedError
    }
    if (migratedError) {
      console.error('[v0] Migrated count error:', migratedError)
      throw migratedError
    }
    if (partnersError) {
      console.error('[v0] Partners list error:', partnersError)
      throw partnersError
    }

    return {
      success: true,
      totalNonMigrated: totalNonMigrated || 0,
      totalMigrated: totalMigrated || 0,
      nonMigratedPartners: nonMigratedPartners || [],
      error: null
    }
  } catch (error) {
    console.error('[v0] getMigrationStats error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      totalNonMigrated: 0,
      totalMigrated: 0,
      nonMigratedPartners: [],
      error: errorMsg
    }
  }
}

export default async function MigracijePage() {
  const stats = await getMigrationStats()

  // Error state - show migration setup instructions
  if (!stats.success || stats.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Migracija partnerjev</h1>
          <p className="text-muted-foreground mt-1">
            Povežite stare partnerje s novim sistemom obrtnik_profiles
          </p>
        </div>

        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="mt-4 space-y-4">
            <div>
              <p className="font-semibold text-red-900">Podatki trenutno niso dosegljivi</p>
              <p className="text-sm text-red-800 mt-1">
                {stats.error || 'Unknown error fetching migration data'}
              </p>
            </div>

            <div className="bg-white p-4 rounded border border-red-200">
              <p className="text-xs font-semibold text-gray-900 mb-2">
                🔧 Možni vzrok: SQL migracija še ni bila zagnana v Supabase
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Zaženite naslednjo SQL migracijsko skripto v Supabase konzoli:
              </p>
              <pre className="text-xs overflow-x-auto text-gray-700 bg-gray-100 p-3 rounded border border-gray-300 font-mono leading-relaxed">
{`ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS new_profile_id uuid,
ADD COLUMN IF NOT EXISTS migrated_at timestamptz;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_partners_new_profile_id 
ON public.partners(new_profile_id);`}
              </pre>
            </div>

            <div className="flex gap-2">
              <form action={() => { if (typeof window !== 'undefined') window.location.reload() }} className="flex gap-2">
                <Button 
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-600 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="h-4 w-4" />
                  Poskusi znova
                </Button>
              </form>
              <Button 
                variant="outline"
                size="sm"
                asChild
              >
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                  Odpri Supabase
                </a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

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
            <div className="text-2xl font-bold text-orange-600">{stats.totalNonMigrated}</div>
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
            <div className="text-2xl font-bold text-green-600">{stats.totalMigrated}</div>
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
            <div className="text-2xl font-bold text-blue-600">{migrationPercentage}%</div>
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
      {stats.totalNonMigrated > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Akcije</CardTitle>
            <CardDescription>
              Migrirajte partnerje individualno ali v skupinah
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MigrateAllPartnersAction
              totalNonMigrated={stats.totalNonMigrated}
            />
          </CardContent>
        </Card>
      )}

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
                  <TableHead>Podjetje</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Datum registracije</TableHead>
                  <TableHead className="text-right">Akcija</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.nonMigratedPartners.map((partner: any) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">
                      {partner.company_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {partner.email || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {partner.created_at ? new Date(partner.created_at).toLocaleDateString('sl-SI') : '-'}
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
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-8 text-center">
            <p className="text-green-900 font-semibold">
              ✓ Vsi partnerji so že migrirani v novi sistem!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
