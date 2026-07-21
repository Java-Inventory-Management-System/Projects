import { Skeleton } from "./skeleton"

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-1">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="rounded-lg border">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none border-b last:border-b-0" />
        ))}
      </div>
    </div>
  )
}
