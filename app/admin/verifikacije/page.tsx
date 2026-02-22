import { createClient } from '@/lib/supabase/server'
import { manuallyVerifyObrtnik } from '@/lib/mcp/ajpes'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VerificationActions } from '@/components/admin/VerificationActions'

async function getPendingVerifications() {
  const supabase = await createClient()

  const { data: verifications, error } = await supabase
    .from('verifications')
    .select(`
      id,
      obrtnik_id,
      ajpes_id,
      ajpes_response,
      status,
      created_at,
      obrtnik_profiles:obrtnik_profiles(id, business_name, email)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching verifications:', error)
    return []
  }

  return verifications || []
}

export default async function VerifikacijePage() {
  const verifications = await getPendingVerifications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Verifikacije obrtnikov</h1>
        <p className="mt-2 text-muted-foreground">
          Pregled zahtevkov za verifikacijo podjetij
        </p>
      </div>

      {verifications.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Ni čakajočih verifikacij
        </Card>
      ) : (
        <div className="space-y-4">
          {verifications.map((verification: any) => (
            <Card key={verification.id} className="p-6">
              <div className="grid gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {verification.obrtnik_profiles?.business_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {verification.obrtnik_profiles?.email}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-orange-600">
                    ⏳ Čaka pregled
                  </Badge>
                </div>

                {/* AJPES Data */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Matična številka: <span className="text-mono">{verification.ajpes_id}</span>
                  </p>

                  {verification.ajpes_response && (
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-1">
                      {verification.ajpes_response.businessName && (
                        <p>
                          <strong>Naziv iz AJPES:</strong> {verification.ajpes_response.businessName}
                        </p>
                      )}
                      {verification.ajpes_response.status && (
                        <p>
                          <strong>Status:</strong> {verification.ajpes_response.status}
                        </p>
                      )}
                      {verification.ajpes_response.address && (
                        <p>
                          <strong>Naslov:</strong> {verification.ajpes_response.address}
                        </p>
                      )}
                      {verification.ajpes_response.legalForm && (
                        <p>
                          <strong>Pravna oblika:</strong> {verification.ajpes_response.legalForm}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end border-t pt-4">
                  <VerificationActions
                    verificationId={verification.id}
                    obrtknikId={verification.obrtnik_id}
                  />
                </div>

                {/* Date */}
                <p className="text-xs text-muted-foreground">
                  Poslano: {new Date(verification.created_at).toLocaleString('sl-SI')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
