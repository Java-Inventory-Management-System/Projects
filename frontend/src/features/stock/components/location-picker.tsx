import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useLocationMap } from "@/hooks/use-location-map"
import { LocationMapGrid } from "@/features/stock/components/location-map-grid"
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
  const { t } = useTranslation()
  const { data, isLoading } = useLocationMap()

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
          className={cn("h-9 text-xs w-full justify-start font-normal", !value && "text-muted-foreground")}
        >
          <MapPin className="size-3 mr-1 shrink-0" />
          {selectedLocation ? selectedLocation.fullCode : t("locPicker.selectLocation")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="sm:w-[520px] w-[90vw] p-3 max-h-96 overflow-y-auto" align="start">
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
          <p className="text-xs text-muted-foreground text-center py-4">{t("locPicker.loadError")}</p>
        ) : (
          <LocationMapGrid data={data} highlightBinId={value ? Number(value) : null} onSelect={onSelect} />
        )}
      </PopoverContent>
    </Popover>
  )
}
