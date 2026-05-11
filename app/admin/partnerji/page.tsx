import { Suspense } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PartnerjiTable } from '@/components/admin/PartnerjiTable'
import { PendingPartnerCard } from '@/components/admin/PendingPartnerCard'
import { PartnerjiFilters } from '@/components/admin/PartnerjiFilters'
import { DodajPartnerjaModal } from '@/components/admin/DodajPartnerjaModal'
import { getAktivneKategorije, getPartnerji } from '../actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

export default async function PartnerjiPage({ searchParams }: PageProps) {
  const { search = '', status = '', page: pageParam = '1' } = await searchParams
  const page = Number(pageParam) || 1

  const [{ partnerji, total, pages }, pendingData, categories] = await Promise.all([
    getPartnerji(search, status || undefined, 'createdAt', page, 25),
    getPartnerji(undefined, 'PENDING', 'createdAt', 1, 10),
    getAktivneKategorije(),
  ])

  const pendingPartnerji = pendingData.partnerji
  // Exclude pending from main table when no status filter is active
  const tablePartnerji = status ? partnerji : partnerji.filter(p => p.status !== 'PENDING')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partnerji</h1>
          <p className="text-muted-foreground">Upravljanje z vsemi partnerji</p>
        </div>
        <div className="flex gap-2">
          <DodajPartnerjaModal categories={categories} />
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Izvozi CSV
          </Button>
        </div>
      </div>

      {/* Pending Verifications Alert */}
      {pendingPartnerji.length > 0 && !status && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Čakajoče verifikacije</AlertTitle>
          <AlertDescription>
            {pendingPartnerji.length} partnerjev čaka na verifikacijo
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Partners Grid — only shown when no status filter */}
      {pendingPartnerji.length > 0 && !status && (
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
          <div className="mb-4">
            <PartnerjiFilters defaultSearch={search} defaultStatus={status} />
          </div>

          <Suspense fallback={<div>Nalaganje...</div>}>
            <PartnerjiTable partnerji={tablePartnerji} currentPage={page} totalPages={pages} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
