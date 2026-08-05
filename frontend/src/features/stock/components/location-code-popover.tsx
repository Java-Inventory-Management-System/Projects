import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useLocationMap } from "@/hooks/use-location-map"
import { LocationMapGrid } from "@/features/stock/components/location-map-grid"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/utils/cn"
import { MapPin } from "lucide-react"

interface LocationCodePopoverProps {
  code: string | null
  className?: string
}

export function LocationCodePopover({ code, className }: LocationCodePopoverProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useLocationMap()

  const bin = useMemo(() => {
    if (!data || !code) return null
    const q = code.toLowerCase()
    for (const zone of data.zones) {
      for (const shelf of zone.shelves) {
        const hit = shelf.bins.find((b) => b.fullCode.toLowerCase() === q)
        if (hit) return hit
      }
    }
    return null
  }, [data, code])

  if (!code) {
    return <span className={cn("text-muted-foreground", className)}>—</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 font-mono text-xs text-muted-foreground rounded px-1 py-0.5 transition-colors hover:text-foreground hover:bg-muted/60 hover:ring-1 hover:ring-ring",
            className,
          )}
        >
          <MapPin className="size-3 shrink-0" />
          {code}
        </button>
      </PopoverTrigger>
      <PopoverContent className="sm:w-[440px] w-[85vw] p-3 max-h-96 overflow-y-auto" align="start">
        {isLoading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ) : !data ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("locPicker.loadError")}</p>
        ) : bin ? (
          <LocationMapGrid data={data} highlightBinId={bin.id} />
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">{t("locPicker.binNotFound")}</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
