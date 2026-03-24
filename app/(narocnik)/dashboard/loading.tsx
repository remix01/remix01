import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function NarocnikDashboardLoading() {
  return (
    <main className="p-4 md:p-8">
      {/* Welcome Section Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardContent className="p-6">
              <Skeleton className="h-9 w-16 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Requests Section Skeleton */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-32 mb-3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}