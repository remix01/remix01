export default function ObrtnikiProfileLoading() {
  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
      </div>

      {/* Hero Section */}
      <section className="border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex gap-6 mb-6">
            {/* Avatar Skeleton */}
            <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0 animate-pulse" />

            {/* Header Info */}
            <div className="flex-1">
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-6 bg-gray-200 rounded-full w-24 animate-pulse" />
                  ))}
                </div>
                <div className="flex gap-6 mt-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:absolute lg:top-32 lg:right-4 lg:w-72 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-8 border-b mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
          ))}
        </div>

        {/* Tab Content Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    </main>
  )
}
