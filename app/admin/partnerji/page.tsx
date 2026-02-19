import { Suspense } from 'react'
import { Search, Download, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PartnerjiTable } from '@/components/admin/PartnerjiTable'
import { PendingPartnerCard } from '@/components/admin/PendingPartnerCard'
import { getPartnerji } from '../actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: {
    search?: string
    status?: string
    page?: string
  }
}

export default async function PartnerjiPage({ searchParams }: PageProps) {
  const search = searchParams.search || ''
  const statusFilter = searchParams.status
  const page = Number(searchParams.page) || 1

  const [{ partnerji, total, pages }, pendingData] = await Promise.all([
    getPartnerji(search, statusFilter, 'createdAt', page, 25),
    getPartnerji(undefined, 'PENDING', 'createdAt', 1, 10),
  ])

  const pendingPartnerji = pendingData.partnerji

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partnerji</h1>
          <p className="text-muted-foreground">Upravljanje z vsemi partnerji</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Izvozi CSV
        </Button>
      </div>

      {/* Pending Verifications Alert */}
      {pendingPartnerji.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Čakajoče verifikacije</AlertTitle>
          <AlertDescription>
            {pendingPartnerji.length} partnerjev čaka na verifikacijo
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Partners Grid */}
      {pendingPartnerji.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Čakajoči na verifikacijo</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingPartnerji.map((partner) => (
              <PendingPartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Seznam partnerjev ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Išči po imenu, emailu ali podjetju..."
                className="pl-9"
                defaultValue={search}
              />
            </div>
            <select className="rounded-md border px-3 py-2">
              <option value="">Vsi statusi</option>
              <option value="PENDING">Čakajo verifikacijo</option>
              <option value="AKTIVEN">Aktivni</option>
              <option value="SUSPENDIRAN">Suspendirani</option>
            </select>
          </div>

          <Suspense fallback={<div>Nalaganje...</div>}>
            <PartnerjiTable partnerji={partnerji} currentPage={page} totalPages={pages} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
