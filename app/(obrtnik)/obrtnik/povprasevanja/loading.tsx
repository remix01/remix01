import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function ObrtnikPovprasevanjaLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-40 mb-1" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Filter Bar */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Grid of Request Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}