import { Skeleton } from '@/components/ui/skeleton'

export default function MediaLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-52" />
      </div>

      {/* Upload zone */}
      <Skeleton className="h-32 w-full rounded-lg" />

      {/* Image grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  )
}
