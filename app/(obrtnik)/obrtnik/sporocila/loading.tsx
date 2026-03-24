import { Skeleton } from '@/components/ui/skeleton'

export default function ObrtnikSporocilaLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation List */}
      <div className="w-80 border-r p-4 space-y-3">
        <Skeleton className="h-10 w-full mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={i % 2 === 0 ? "flex justify-end" : ""}>
              <Skeleton className={`h-14 ${i % 2 === 0 ? "w-1/2" : "w-2/3"} rounded-lg`} />
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