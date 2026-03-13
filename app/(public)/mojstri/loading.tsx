import { Skeleton } from '@/components/ui/skeleton'

export default function MojstriLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Skeleton */}
          <aside className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Search Input */}
              <Skeleton className="h-10 w-full" />

              {/* Category Buttons */}
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
          </aside>

          {/* Main Content Skeleton */}
          <main className="lg:col-span-3">
            {/* Results Header */}
            <div className="mb-6">
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>

            {/* Grid of Skeleton Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="border rounded-lg overflow-hidden bg-white animate-pulse"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b bg-slate-50 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </main>
  )
}
