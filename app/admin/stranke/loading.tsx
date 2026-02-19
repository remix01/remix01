import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function StrankeLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-2 h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <Skeleton className="h-10 w-full" />

          {/* Table */}
          <div className="space-y-2">
            {/* Table Header */}
            <div className="flex gap-4 border-b pb-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {/* Table Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex gap-4 py-3">
                {[...Array(6)].map((_, j) => (
                  <Skeleton key={j} className="h-5 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
