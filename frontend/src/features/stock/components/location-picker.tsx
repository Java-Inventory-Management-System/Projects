import { useEffect, useMemo } from "react"
import { useLocationMap } from "@/hooks/use-location-map"
import { useLocationMapStore } from "@/store/location-map-store"
import { binColor } from "@/features/stock/utils/location-map-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/utils/cn"
import { MapPin } from "lucide-react"

interface LocationPickerProps {
  value: string
  onSelect: (locationId: string) => void
  suggestedLocationId?: number | null
}

export function LocationPicker({ value, onSelect, suggestedLocationId }: LocationPickerProps) {
  const { data: fetched, isLoading } = useLocationMap()
  const { data: local, setData } = useLocationMapStore()

  useEffect(() => { if (fetched && !local) setData(fetched) }, [fetched])

  const data = local ?? fetched

  const selectedLocation = useMemo(() => {
    if (!data || !value) return null
    for (const zone of data.zones) {
      for (const shelf of zone.shelves) {
        const bin = shelf.bins.find((b) => String(b.id) === value)
        if (bin) return bin
      }
    }
    return null
  }, [data, value])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 text-xs w-full justify-start font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <MapPin className="size-3 mr-1 shrink-0" />
          {selectedLocation ? selectedLocation.fullCode : "Chọn vị trí..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[520px] p-3 max-h-96 overflow-y-auto"
        align="start"
      >
        {isLoading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        ) : !data ? (
          <p className="text-xs text-muted-foreground text-center py-4">Không thể tải bản đồ kho</p>
        ) : (
          <div className="space-y-2">
            {data.zones.map((zone) => {
              const allBins = zone.shelves.flatMap((s) => s.bins)
              if (allBins.length === 0) return null
              return (
                <div key={zone.zoneCode} className="rounded-md border p-2">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                    Khu {zone.zoneCode}
                  </p>
                  <div className="space-y-1">
                    {zone.shelves.map((shelf) => (
                      <div key={shelf.shelfCode} className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground/60 w-6 shrink-0 text-right">
                          {shelf.shelfCode}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {shelf.bins.map((bin) => {
                            const isSelected = String(bin.id) === value
                            const isSuggested = suggestedLocationId === bin.id && !isSelected
                            const color = binColor(bin.productCount)
                            return (
                              <button
                                key={bin.id}
                                type="button"
                                onClick={() => onSelect(String(bin.id))}
                                className={cn(
                                  "flex items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-mono transition-all cursor-pointer hover:ring-1 hover:ring-ring min-w-[2rem]",
                                  color.bg,
                                  color.border,
                                  isSelected && "ring-2 ring-primary",
                                  isSuggested && !isSelected && "ring-1 ring-blue-400",
                                )}
                                title={`${bin.fullCode}${bin.productCount > 0 ? ` (${bin.productCount} sp)` : " (trống)"}`}
                              >
                                {bin.binCode}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
