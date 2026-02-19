import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function StrankaDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />

      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-48" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[...Array(7)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-5 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  )
}
