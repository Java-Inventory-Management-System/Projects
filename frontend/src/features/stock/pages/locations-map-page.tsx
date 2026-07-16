import { useEffect, useState } from "react"
import { getLocationMap } from "@/features/stock/services/location-service"
import type { LocationMapData } from "@/utils/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function BinColor({ count }: { count: number }) {
  if (count === 0) return "bg-green-200 border-green-400"
  if (count < 5) return "bg-amber-200 border-amber-400"
  return "bg-red-200 border-red-400"
}

export const LocationsMapPage = () => {
  const [data, setData] = useState<LocationMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = () => {
    setLoading(true)
    setError(null)
    getLocationMap()
      .then(setData)
      .catch((err) => setError((err as Error).message || "Không thể tải bản đồ kho"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Bản đồ kho</h1>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className="size-4 mr-1" /> Làm mới
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Chú thích:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-green-200 border border-green-400" />
          Trống
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-amber-200 border border-amber-400" />
          Có hàng (&lt; 5)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-red-200 border border-red-400" />
          Đầy (&ge; 5)
        </span>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-5 w-20" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetch}>
            <RefreshCw className="size-3 mr-1" /> Thử lại
          </Button>
        </div>
      ) : data?.zones.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">Chưa có vị trí nào</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.zones.map((zone) => (
            <div key={zone.zoneCode} className="rounded-lg border p-4 space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Khu {zone.zoneCode}</h2>
              <div className="space-y-2">
                {zone.shelves.map((shelf) => (
                  <div key={shelf.shelfCode}>
                    <p className="text-[11px] text-muted-foreground mb-1">Kệ {shelf.shelfCode}</p>
                    <div className="flex flex-wrap gap-1">
                      {shelf.bins.map((bin) => (
                        <Tooltip key={bin.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`size-7 rounded-sm border cursor-pointer transition-colors hover:ring-1 hover:ring-ring ${BinColor({ count: bin.productCount })}`}
                              title={bin.fullCode}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="font-mono">{bin.fullCode}</p>
                            <p>{bin.productCount} sản phẩm</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
