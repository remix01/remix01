import { Suspense } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import Link from 'next/link'
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
  const exportParams = new URLSearchParams()

  if (search) exportParams.set('search', search)
  if (status) exportParams.set('status', status)

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partnerji</h1>
          <p className="text-muted-foreground">Upravljanje z vsemi partnerji</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
          <DodajPartnerjaModal categories={categories} />
          <Button asChild variant="outline" className="w-full gap-2">
            <Link href={`/api/admin/partnerji/export?${exportParams.toString()}`}>
            <Download className="h-4 w-4" />
            Izvozi CSV
            </Link>
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
