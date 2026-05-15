import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrankeTable } from '@/components/admin/StrankeTable'
import { StrankeSearch } from '@/components/admin/StrankeSearch'
import { DodajStrankoModal } from '@/components/admin/DodajStrankoModal'
import { getStranke } from '../actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

export default async function StrankePage({ searchParams }: PageProps) {
  const { search = '', page: pageParam = '1' } = await searchParams
  const page = Number(pageParam) || 1

  const { stranke, total, pages } = await getStranke(search, 'createdAt', page, 25)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stranke</h1>
          <p className="text-muted-foreground">Upravljanje z vsemi strankami</p>
        </div>
        <DodajStrankoModal />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seznam strank ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <StrankeSearch defaultValue={search} />
          </div>

          <Suspense fallback={<div>Nalaganje...</div>}>
            <StrankeTable stranke={stranke} currentPage={page} totalPages={pages} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
