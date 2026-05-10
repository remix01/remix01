import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type LoadingVariant = 'dashboard' | 'table' | 'split-chat'

interface LoadingStateProps {
  variant?: LoadingVariant
}

export function LoadingState({ variant = 'dashboard' }: LoadingStateProps) {
  if (variant === 'split-chat') {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-80 space-y-3 border-r p-4">
          <Skeleton className="mb-4 h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 border-b p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex-1 space-y-4 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={i % 2 === 0 ? 'flex justify-end' : ''}>
                <Skeleton className={`h-16 rounded-lg ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
          <div className="border-t p-4">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'table') {
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
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

