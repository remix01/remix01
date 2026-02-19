import { Suspense } from 'react'
import { Search, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StrankeTable } from '@/components/admin/StrankeTable'
import { getStranke } from '../actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: {
    search?: string
    page?: string
  }
}

export default async function StrankePage({ searchParams }: PageProps) {
  const search = searchParams.search || ''
  const page = Number(searchParams.page) || 1

  const { stranke, total, pages } = await getStranke(search, 'createdAt', page, 25)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stranke</h1>
          <p className="text-muted-foreground">Upravljanje z vsemi strankami</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Izvozi CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seznam strank ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Išči po imenu ali emailu..."
                className="pl-9"
                defaultValue={search}
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  if (e.target.value) {
                    url.searchParams.set('search', e.target.value)
                  } else {
                    url.searchParams.delete('search')
                  }
                  url.searchParams.set('page', '1')
                  window.history.pushState({}, '', url.toString())
                }}
              />
            </div>
          </div>

          <Suspense fallback={<div>Nalaganje...</div>}>
            <StrankeTable stranke={stranke} currentPage={page} totalPages={pages} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
