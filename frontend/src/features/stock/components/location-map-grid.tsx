import { useTranslation } from "react-i18next"
import { binColor } from "@/features/stock/utils/location-map-utils"
import { cn } from "@/utils/cn"
import type { LocationMapData } from "@/utils/types"

interface LocationMapGridProps {
  data: LocationMapData
  highlightBinId?: number | null
  onSelect?: (binId: string) => void
}

export function LocationMapGrid({ data, highlightBinId = null, onSelect }: LocationMapGridProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      {data.zones.map((zone) => {
        const allBins = zone.shelves.flatMap((s) => s.bins)
        if (allBins.length === 0) return null
        return (
          <div key={zone.zoneCode} className="rounded-md border p-2">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{t("locPicker.zone")} {zone.zoneCode}</p>
            <div className="space-y-1">
              {zone.shelves.map((shelf) => (
                <div key={shelf.shelfCode} className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground/60 w-6 shrink-0 text-right">
                    {shelf.shelfCode}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {shelf.bins.map((bin) => {
                      const isSelected = String(bin.id) === String(highlightBinId)
                      const color = binColor(bin.productCount, bin.maxCapacity)
                      const boxCodesTitle = bin.boxCodes.length > 0 ? ` · ${bin.boxCodes.join(", ")}` : ""
                      const inner = (
                        <span
                          className={cn(
                            "flex items-center justify-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-mono min-w-[2rem]",
                            color.bg,
                            color.border,
                            isSelected && "ring-2 ring-primary",
                          )}
                          title={`${bin.fullCode}${bin.maxCapacity != null ? ` (${bin.productCount}/${bin.maxCapacity})` : bin.productCount > 0 ? ` (${bin.productCount} ${t("locPicker.units")})` : ` (${t("locPicker.empty")})`}${bin.boxCount > 0 ? ` · ${bin.boxCount} ${t("locPicker.boxes")}${boxCodesTitle}` : ""}`}
                        >
                          {bin.binCode}
                          {bin.boxCount > 0 && (
                            <span
                              className="rounded-sm bg-amber-100 px-1 text-[8px] font-semibold leading-3 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                              title={`${bin.boxCodes.join(", ")}`}
                            >
                              {bin.boxCount}
                            </span>
                          )}
                        </span>
                      )
                      return onSelect ? (
                        <button
                          key={bin.id}
                          type="button"
                          onClick={() => onSelect(String(bin.id))}
                          className="cursor-pointer transition-all hover:ring-1 hover:ring-ring"
                        >
                          {inner}
                        </button>
                      ) : (
                        <span key={bin.id}>{inner}</span>
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
  )
}
