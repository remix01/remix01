import { Suspense } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StrankeTable } from '@/components/admin/StrankeTable'
import { getStranke } from '../actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

export default async function StrankePage({ searchParams }: PageProps) {
  const { search: searchRaw, page: pageRaw } = await searchParams
  const search = searchRaw || ''
  const page = Number(pageRaw) || 1

  const { stranke, total, pages } = await getStranke(search, 'createdAt', page, 25)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stranke</h1>
          <p className="text-muted-foreground">Upravljanje z vsemi strankami</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seznam strank ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <form method="get">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Išči po imenu ali emailu..."
                  className="pl-9"
                  defaultValue={search}
                />
              </div>
            </form>
          </div>

          <Suspense fallback={<div>Nalaganje...</div>}>
            <StrankeTable stranke={stranke} currentPage={page} totalPages={pages} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
