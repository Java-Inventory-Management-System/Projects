import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, Plus, Minus, X, Settings2, Undo2, ArrowLeft, DoorOpen, GripVertical, ChevronRight, ChevronDown } from "lucide-react"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { FilterMode } from "@/features/stock/utils/location-map-utils"
import { LEVELS, FILTERS, binColor } from "@/features/stock/utils/location-map-utils"
import type { LocationMapBinProduct } from "@/utils/types"
import { TRACKING_TYPE } from "@/utils/types"
import { TrackingTypeBadge } from "@/components/tracking-type-badge"
import { useLocationMapPage } from "@/features/stock/hooks/use-location-map-page"
import { toast } from "@/utils/toast"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"

export function LocationsMapPage() {
  const { t } = useTranslation()
  const perm = usePermission()
  const canManageLocation = perm.hasRole(...ROLES.MANAGE_LOCATION)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const {
    data,
    loading,
    refreshing,
    error,
    fetchMap,
    totalBins,
    search,
    setSearch,
    filter,
    setFilter,
    selectedBin,
    sheetOpen,
    setSheetOpen,
    capacityDraft,
    setCapacityDraft,
    capacitySaving,
    handleUpdateCapacity,
    managing,
    setManaging,
    confirmBinId,
    setConfirmBinId,
    confirmZoneCode,
    setConfirmZoneCode,
    filteredZones,
    isBinActive,
    openDetail,
    handleDeactivateBin,
    handleReactivateBin,
    handleAddZone,
    handleBinDelete,
    handleZoneDelete,
    autoAddBin,
    autoAddShelf,
    zoomedShelf,
    openZoom,
    zoomStage,
    viewMode,
    switchView,
    zoomedZone,
    zoomedShelfData,
    dragSource,
    setDragSource,
    handleDragStart,
    handleDrop,
    relocateTarget,
    relocateCountdown,
    relocateQuantity,
    setRelocateQuantity,
    handleRelocateCancel,
    handleRelocateConfirm,
    highlightBinId,
  } = useLocationMapPage()

  useEffect(() => {
    if (highlightBinId) {
      const el = document.getElementById("bin-" + highlightBinId)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightBinId])

  function toggleExpand(key: string) {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function productRow(p: LocationMapBinProduct, key: string) {
    const expanded = expandedProducts.has(key)
    const label = [p.productName, p.productSku].filter(Boolean).join(" - ")
    return (
      <li key={key} className="text-xs">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 rounded px-1.5 py-1 text-left hover:bg-muted/60"
          onClick={() => toggleExpand(key)}
        >
          <span className="flex items-center gap-1 truncate text-foreground/80">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{label || p.productSku}</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <TrackingTypeBadge type={p.trackingType} />
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium tabular-nums text-primary">
{p.trackingType === TRACKING_TYPE.BULK
                ? t("locMap.bulkUnits", { count: p.quantity })
                : String(p.quantity)}
            </span>
          </span>
        </button>
        {expanded && (
          <ul className="mt-0.5 ml-5 space-y-0.5">
            {p.trackingType === TRACKING_TYPE.BULK ? (
              <li className="text-xs text-muted-foreground">{t("locMap.bulkNoSerials")}</li>
            ) : (
              p.serials.map((s) => (
                <li key={s} className="text-xs font-mono text-foreground/70">
                  {s}
                </li>
              ))
            )}
          </ul>
        )}
      </li>
    )
  }

  const looseProducts = (selectedBin?.products ?? []).filter((p) => p.boxId == null)
  const looseCount = looseProducts.reduce((sum, p) => sum + p.quantity, 0)
  const boxGroups = (() => {
    const map = new Map<number, { boxId: number; boxCode: string; boxType: string | null; total: number; products: LocationMapBinProduct[] }>()
    for (const p of selectedBin?.products ?? []) {
      if (p.boxId == null) continue
      let g = map.get(p.boxId)
      if (!g) {
        g = { boxId: p.boxId, boxCode: p.boxCode ?? "", boxType: p.boxType, total: 0, products: [] }
        map.set(p.boxId, g)
      }
      g.total += p.quantity
      g.products.push(p)
    }
    return [...map.values()].sort((a, b) => a.boxCode.localeCompare(b.boxCode))
  })()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("locMap.title")}</h1>
          {!loading && data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("locMap.zoneCount", { zones: data.zones.length, bins: totalBins })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
{canManageLocation && (
<Button size="sm" variant={managing ? "default" : "outline"} onClick={() => setManaging((m: boolean) => !m)}>
<Settings2 className="size-3.5 mr-1" />
{managing ? t("locMap.done") : t("locMap.manageLocations")}
</Button>
)}
          <Button variant="outline" size="sm" onClick={() => fetchMap()} disabled={loading || refreshing}>
            <RefreshCw className={`size-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            {t("locMap.refresh")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 rounded-lg border p-0.5 bg-muted/40">
          {(["zone", "overview"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchView(m)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(m === "zone" ? "locMap.viewZone" : "locMap.viewOverview")}
            </button>
          ))}
        </div>
        {viewMode === "zone" && (data?.zones.length ?? 0) > 0 && (
          <Select
            value={zoomedZone?.zoneCode ?? ""}
            onValueChange={(code) => openZoom({ zoneCode: code, shelfCode: null })}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder={t("locMap.selectZone")} />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]">
              {(data?.zones ?? []).map((z) => (
                <SelectItem key={z.zoneCode} value={z.zoneCode} className="text-xs">
                  {z.zoneCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t("locMap.searchPlaceholder")}
            className="pl-7 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as FilterMode)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {t(`locMap.filter${f.key.charAt(0).toUpperCase() + f.key.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        {LEVELS.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className={`inline-block size-3 rounded-sm ${c.bg} ${c.border} border`} />
            {t(`locMap.level${c.key.charAt(0).toUpperCase() + c.key.slice(1)}`)}
          </span>
        ))}
      </div>

      {zoomStage !== "idle" && zoomedShelfData && zoomedShelf ? (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => openZoom(null)}>
            <ArrowLeft className="size-3.5 mr-1" /> {t("locMap.backToOverview")}
          </Button>
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {t("locMap.zoomedHeader", { zone: zoomedShelf.zoneCode, shelf: zoomedShelf.shelfCode })}
              </h2>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {t("locMap.binCount", { count: zoomedShelfData.bins.length })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4" onDragOver={(e) => { e.preventDefault() }}>
              {zoomedShelfData.bins.map((bin) => {
                const detail = { id: bin.id, zoneCode: zoomedShelf.zoneCode, fullCode: bin.fullCode, binCode: bin.binCode, productCount: bin.productCount, maxCapacity: bin.maxCapacity, productSkuList: bin.productSkuList, boxCount: bin.boxCount, boxCodes: bin.boxCodes, products: bin.products }
                const active = isBinActive(detail)
                const color = binColor(bin.productCount, bin.maxCapacity)
                const isDragSource = dragSource?.bin.id === bin.id
                const dropDisabled = dragSource != null && (
                  bin.maxCapacity != null && bin.productCount >= bin.maxCapacity
                )
                return (
                  <div
                    key={bin.id}
                    className="relative"
                    draggable={managing && active && bin.productCount > 0}
                    onDragStart={() => { handleDragStart(detail) }}
                    onDrop={() => { handleDrop(detail) }}
                    onDragEnd={() => { setDragSource(null) }}
                  >
                    {managing ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <button
                                type="button"
                                id={"bin-" + bin.id}
                                onClick={() => { if (dragSource) handleDrop(detail); else openDetail(detail) }}
                                className={
                                  "flex flex-col items-center justify-center rounded-lg border transition-all hover:shadow-md hover:ring-1 hover:ring-ring " +
                                  color.bg + " " + color.border +
                                  (active ? "" : " opacity-40 saturate-0 ring-1 ring-destructive/40 border-destructive/60") +
                                  (isDragSource ? " ring-2 ring-primary opacity-60" : "") +
                                  (highlightBinId === bin.id ? " ring-2 ring-amber-400" : "") +
                                  (dropDisabled ? " cursor-not-allowed opacity-40" : "")
                                }
                              style={{ minWidth: "5.5rem", minHeight: "4rem" }}
                            >
                              <span className="text-sm font-mono font-semibold leading-tight">{bin.binCode}
                          {bin.boxCount > 0 && (
                            <span className="ml-1 rounded-sm bg-amber-100 px-1 text-[8px] font-semibold leading-3 align-middle text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" title={bin.boxCodes.join(", ")}>
                              {bin.boxCount}
                            </span>
                          )}
                        </span>
                              <span className={"text-sm leading-tight " + color.text}>{bin.productCount}{bin.maxCapacity != null ? ` (${Math.round((bin.productCount / bin.maxCapacity) * 100)}%)` : ""}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            <p className="font-mono font-semibold">{bin.fullCode}</p>
                            <p>{t("locMap.productCountLabel", { count: bin.productCount })}</p>
                            <p>{t("locMap.boxesInBin", { count: bin.boxCount })}</p>
                            <p className="text-muted-foreground">{active && bin.productCount > 0 ? t("locMap.dragToMove") : t("locMap.clickToManage")}</p>
                          </TooltipContent>
                        </Tooltip>
                        {active && bin.productCount > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDragStart(detail) }}
                                className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors cursor-pointer"
                              >
                                <GripVertical className="size-2.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px]">{t("locMap.moveProducts")}</TooltipContent>
                          </Tooltip>
                        )}
                        {!active && detail.productCount === 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReactivateBin(detail) }}
                                className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors cursor-pointer"
                              >
                                <Undo2 className="size-2.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px]">{t("locMap.reactivate")}</TooltipContent>
                          </Tooltip>
                        )}
                        {detail.productCount > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm opacity-30 cursor-not-allowed"
                                disabled
                              >
                                <X className="size-2.5" />
                              </button>
                            </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[11px]">{t("locMap.hasProducts")}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Popover open={confirmBinId === bin.id} onOpenChange={(o) => setConfirmBinId(o ? bin.id : null)}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors cursor-pointer"
                                  >
                                    <X className="size-2.5" />
                                  </button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-[11px]">{isBinActive(detail) ? t("locMap.deactivate") : t("locMap.delete")}</TooltipContent>
                            </Tooltip>
                            <PopoverContent side="top" className="w-auto min-w-[130px] p-2">
                              {isBinActive(detail) ? (
                                <>
                                  <p className="text-xs mb-1.5 font-medium">{t("locMap.confirmDeactivate", { code: bin.binCode })}</p>
                                  <div className="flex gap-1 justify-end">
                                    <button onClick={() => setConfirmBinId(null)} className="text-[11px] px-2 py-0.5 rounded hover:bg-accent">{t("locMap.cancelSmall")}</button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmBinId(null); handleDeactivateBin(detail) }} className="text-[11px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90">{t("locMap.deactivate")}</button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs mb-1.5 font-medium">{t("locMap.confirmDelete", { code: bin.binCode })}</p>
                                  <div className="flex gap-1 justify-end">
                                    <button onClick={() => setConfirmBinId(null)} className="text-[11px] px-2 py-0.5 rounded hover:bg-accent">{t("locMap.cancelSmall")}</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleBinDelete(detail) }} className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("locMap.delete")}</button>
                                  </div>
                                </>
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                      </>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            id={"bin-" + bin.id}
                            onClick={() => openDetail(detail)}
                            className={
                              "flex flex-col items-center justify-center rounded-lg border transition-all hover:shadow-md hover:ring-1 hover:ring-ring cursor-pointer " +
                              color.bg + " " + color.border +
                              (active ? "" : " opacity-40 saturate-0 ring-1 ring-destructive/40 border-destructive/60") +
                              (highlightBinId === bin.id ? " ring-2 ring-amber-400" : "")
                            }
                            style={{ minWidth: "5.5rem", minHeight: "4rem" }}
                          >
                            <span className="text-sm font-mono font-semibold leading-tight">{bin.binCode}
                          {bin.boxCount > 0 && (
                            <span className="ml-1 rounded-sm bg-amber-100 px-1 text-[8px] font-semibold leading-3 align-middle text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" title={bin.boxCodes.join(", ")}>
                              {bin.boxCount}
                            </span>
                          )}
                        </span>
                            <span className={"text-sm leading-tight " + color.text}>{bin.productCount}{bin.maxCapacity != null ? ` (${Math.round((bin.productCount / bin.maxCapacity) * 100)}%)` : ""}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[11px]">
                          <p className="font-mono font-semibold">{bin.fullCode}</p>
                          <p>{t("locMap.productCountLabel", { count: bin.productCount })}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )
              })}
              {managing && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => autoAddBin(zoomedShelf.zoneCode, zoomedShelf.shelfCode!)}
                      className="flex items-center justify-center rounded-lg border border-dashed border-blue-200 dark:border-blue-900 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                      style={{ width: "5rem", height: "3.5rem" }}
                    >
                      <Plus className="size-4 text-blue-400 dark:text-blue-300" />
                    </button>
                  </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">{t("locMap.addBin")}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      ) : zoomStage !== "idle" && zoomedZone ? (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => openZoom(null)}>
            <ArrowLeft className="size-3.5 mr-1" /> {t("locMap.backToOverview")}
          </Button>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="size-4 text-muted-foreground/40" />
                <h2 className="text-base font-semibold">{t("locMap.zoneLabel", { code: zoomedZone.zoneCode })}</h2>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("locMap.binCount", { count: zoomedZone.shelves.reduce((s: number, sh) => s + sh.bins.length, 0) })}
              </span>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              {zoomedZone.shelves.map((shelf) => {
                const occ = shelf.bins.filter((b) => b.productCount > 0).length
                const pct = shelf.bins.length > 0 ? Math.round((occ / shelf.bins.length) * 100) : 0
                return (
                  <div key={shelf.shelfCode} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => openZoom({ zoneCode: zoomedZone.zoneCode, shelfCode: shelf.shelfCode })}
                      className="text-sm font-semibold hover:text-foreground/80 transition-colors text-left cursor-pointer"
                    >
                      {t("locMap.shelfLabel", { code: shelf.shelfCode })}
                    </button>
                      <div className="flex flex-wrap items-start gap-4">
                        {shelf.bins.map((bin) => {
                        const detail = {
                          id: bin.id,
                          zoneCode: zoomedZone.zoneCode,
                          fullCode: bin.fullCode,
                          binCode: bin.binCode,
                          productCount: bin.productCount,
                          maxCapacity: bin.maxCapacity,
                          productSkuList: bin.productSkuList,
                          boxCount: bin.boxCount,
                          boxCodes: bin.boxCodes,
                          products: bin.products,
                        }
                        const active = isBinActive(detail)
                        const color = binColor(bin.productCount, bin.maxCapacity)
                        const isDragSource = dragSource?.bin.id === bin.id
                        const dropDisabled = dragSource != null && (
                          detail.zoneCode !== dragSource.zoneCode ||
                          (bin.maxCapacity != null && bin.productCount >= bin.maxCapacity)
                        )
                        return (
                          <div
                            key={bin.id}
                            className="relative"
                            draggable={managing && active && bin.productCount > 0}
                            onDragStart={() => { handleDragStart(detail) }}
                            onDrop={() => { handleDrop(detail) }}
                            onDragEnd={() => { setDragSource(null) }}
                          >
                            {managing ? (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      id={"bin-" + bin.id}
                                      onClick={() => { if (dragSource) handleDrop(detail); else openDetail(detail) }}
                                      className={
                                        "flex flex-col items-center justify-center rounded-lg border transition-all hover:shadow-sm hover:ring-1 hover:ring-ring " +
                                        color.bg + " " + color.border +
                                        (active ? "" : " opacity-40 saturate-0 ring-1 ring-destructive/40 border-destructive/60") +
                                        (isDragSource ? " ring-2 ring-primary opacity-60" : "") +
                                        (highlightBinId === bin.id ? " ring-2 ring-amber-400" : "") +
                                        (dropDisabled ? " cursor-not-allowed opacity-40" : "")
                                      }
                                      style={{ minWidth: "6rem", minHeight: "4.5rem" }}
                                    >
                                      <span className="text-sm font-mono font-semibold leading-tight">{bin.binCode}
                          {bin.boxCount > 0 && (
                            <span className="ml-1 rounded-sm bg-amber-100 px-1 text-[8px] font-semibold leading-3 align-middle text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" title={bin.boxCodes.join(", ")}>
                              {bin.boxCount}
                            </span>
                          )}
                        </span>
                                      <span className={"text-sm leading-tight " + color.text}>{bin.productCount}{bin.maxCapacity != null ? ` (${Math.round((bin.productCount / bin.maxCapacity) * 100)}%)` : ""}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[11px]">
                                    <p className="font-mono font-semibold">{bin.fullCode}</p>
                                    <p>{t("locMap.productCountLabel", { count: bin.productCount })}</p>
                                    <p>{t("locMap.boxesInBin", { count: bin.boxCount })}</p>
                                    <p className="text-muted-foreground">{active && bin.productCount > 0 ? t("locMap.dragToMove") : t("locMap.clickToManage")}</p>
                                  </TooltipContent>
                              </Tooltip>
                              {active && bin.productCount > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDragStart(detail) }}
                                      className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors cursor-pointer"
                                    >
                                      <GripVertical className="size-2.5 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[11px]">{t("locMap.moveProducts")}</TooltipContent>
                                </Tooltip>
                              )}
                              {!active && detail.productCount === 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleReactivateBin(detail)
                                        }}
                                        className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors"
                                      >
                                        <Undo2 className="size-2.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[11px]">
                                      {t("locMap.reactivate")}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {detail.productCount > 0 ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm opacity-30 cursor-not-allowed"
                                        disabled
                                      >
                                        <X className="size-2.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[11px]">
                                      {t("locMap.hasProducts")}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Popover
                                    open={confirmBinId === bin.id}
                                    onOpenChange={(o) => setConfirmBinId(o ? bin.id : null)}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <button
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors cursor-pointer"
                                          >
                                            <X className="size-2.5" />
                                          </button>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-[11px]">
                                        {isBinActive(detail) ? t("locMap.deactivate") : t("locMap.delete")}
                                      </TooltipContent>
                                    </Tooltip>
                                    <PopoverContent side="top" className="w-auto min-w-[130px] p-2">
                                      {isBinActive(detail) ? (
                                        <>
                                          <p className="text-xs mb-1.5 font-medium">
                                            {t("locMap.confirmDeactivate", { code: bin.binCode })}
                                          </p>
                                          <div className="flex gap-1 justify-end">
                                            <button
                                              onClick={() => setConfirmBinId(null)}
                                              className="text-[11px] px-2 py-0.5 rounded hover:bg-accent"
                                            >
                                              {t("locMap.cancelSmall")}
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setConfirmBinId(null)
                                                handleDeactivateBin(detail)
                                              }}
                                              className="text-[11px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                                            >
                                              {t("locMap.deactivate")}
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-xs mb-1.5 font-medium">
                                            {t("locMap.confirmDelete", { code: bin.binCode })}
                                          </p>
                                          <div className="flex gap-1 justify-end">
                                            <button
                                              onClick={() => setConfirmBinId(null)}
                                              className="text-[11px] px-2 py-0.5 rounded hover:bg-accent"
                                            >
                                              {t("locMap.cancelSmall")}
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleBinDelete(detail)
                                              }}
                                              className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              {t("locMap.delete")}
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    id={"bin-" + bin.id}
                                    onClick={() => openDetail(detail)}
                                    className={
                                      "flex flex-col items-center justify-center rounded-lg border transition-all hover:shadow-sm hover:ring-1 hover:ring-ring " +
                                      color.bg + " " + color.border +
                                      (active ? "" : " opacity-40 saturate-0 ring-1 ring-destructive/40 border-destructive/60") +
                                      (highlightBinId === bin.id ? " ring-2 ring-amber-400" : "")
                                    }
                                    style={{ minWidth: "6rem", minHeight: "4.5rem" }}
                                  >
                                    <span className="text-sm font-mono font-semibold leading-tight">{bin.binCode}
                          {bin.boxCount > 0 && (
                            <span className="ml-1 rounded-sm bg-amber-100 px-1 text-[8px] font-semibold leading-3 align-middle text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" title={bin.boxCodes.join(", ")}>
                              {bin.boxCount}
                            </span>
                          )}
                        </span>
                                    <span className={"text-sm leading-tight " + color.text}>{bin.productCount}{bin.maxCapacity != null ? ` (${Math.round((bin.productCount / bin.maxCapacity) * 100)}%)` : ""}</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-[11px]">
                                  <p className="font-mono font-semibold">{bin.fullCode}</p>
                                  <p>{t("locMap.productCountLabel", { count: bin.productCount })}</p>
                                  <p>{t("locMap.boxesInBin", { count: bin.boxCount })}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )
                      })}
                      {managing && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => autoAddBin(zoomedZone.zoneCode, shelf.shelfCode)}
                              className="flex items-center justify-center rounded-lg border border-dashed border-blue-200 dark:border-blue-900 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                              style={{ width: "5.5rem", height: "4rem" }}
                            >
                              <Plus className="size-4 text-blue-400 dark:text-blue-300" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            {t("locMap.addBin")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{t("locMap.occupiedBins", { count: occ, total: shelf.bins.length })}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-muted-foreground/15 overflow-hidden">
                        <div className={"h-full rounded-full transition-all " + (pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary")} style={{ width: pct + "%" }}></div>
                      </div>
                    </div>
                    {managing && (
                      <div className="pt-2 border-t border-dashed border-blue-200 dark:border-blue-900">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => autoAddShelf(zoomedZone.zoneCode)}
                              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:text-blue-300 dark:hover:text-blue-300 transition-colors cursor-pointer"
                            >
                              <Plus className="size-3.5" /> {t("locMap.addShelf")}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            {t("locMap.addNewShelf")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
              <div className="flex flex-wrap gap-1 pt-1">
                <Skeleton className="h-10 w-14" />
                <Skeleton className="h-10 w-14" />
                <Skeleton className="h-10 w-14" />
                <Skeleton className="h-10 w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchMap()}>
            <RefreshCw className="size-3 mr-1" /> {t("locMap.retry")}
          </Button>
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="py-8">
          <Empty>
            <EmptyTitle>
              {search || filter !== "all" ? t("locMap.emptySearch") : t("locMap.emptyWarehouse")}
            </EmptyTitle>
          </Empty>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex">
            <div className="w-10 shrink-0 bg-muted/20 border-r border-dashed border-muted-foreground/20 flex flex-col items-center gap-2 py-4 select-none">
              <DoorOpen className="size-4 text-muted-foreground/40" />
              <span
                className="text-[10px] text-muted-foreground/40 font-medium"
                style={{ writingMode: "vertical-lr", textOrientation: "mixed", transform: "rotate(180deg)", whiteSpace: "nowrap" }}
              >
                {t("locMap.entrance")}
              </span>
            </div>
            <div className="flex-1 p-4 space-y-4">
              {(() => {
                const cols = 3
                const rows: React.ReactNode[] = []
                for (let i = 0; i < filteredZones.length; i += cols) {
                  const chunk = filteredZones.slice(i, i + cols)
                  const isLast = i + cols >= filteredZones.length
                  rows.push(
                    <div key={`row-${i}`}>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {chunk.map((zone) => {
            const allBins = zone.shelves.flatMap((s) => s.bins)
            const occupied = allBins.filter((b) => b.productCount > 0).length
            const full = allBins.filter((b) =>
              b.maxCapacity != null && b.maxCapacity > 0 ? b.productCount >= b.maxCapacity : b.productCount >= 50,
            ).length
            const hasProducts = allBins.some((b) => b.productCount > 0)
            return (
              <div key={zone.zoneCode} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => openZoom({ zoneCode: zone.zoneCode, shelfCode: null })}
                    className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors text-left"
                  >
                    <DoorOpen className="size-3 text-muted-foreground/40" />
                    <h2 className="text-xs font-semibold cursor-pointer">{t("locMap.zoneLabel", { code: zone.zoneCode })}</h2>
                  </button>
                  <div className="flex items-center gap-1">
                    {managing && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                                onClick={() => autoAddShelf(zone.zoneCode)}
                              className="inline-flex items-center justify-center size-5 rounded bg-muted/30 hover:bg-accent transition-colors cursor-pointer"
                            >
                              <Plus className="size-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            {t("locMap.addShelf")}
                          </TooltipContent>
                        </Tooltip>
                        {hasProducts ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => toast.error(t("locationMap.binHasProducts"))}
                                className="inline-flex items-center justify-center size-5 rounded bg-muted/30 hover:bg-accent transition-colors opacity-30 cursor-not-allowed"
                              >
                                <X className="size-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px]">{t("locationMap.binHasProducts")}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Popover
                            open={confirmZoneCode === zone.zoneCode}
                            onOpenChange={(o) => setConfirmZoneCode(o ? zone.zoneCode : null)}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <button className="inline-flex items-center justify-center size-5 rounded bg-muted/30 hover:bg-accent transition-colors cursor-pointer">
                                    <X className="size-3" />
                                  </button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-[11px]">{t("locMap.deleteZone")}</TooltipContent>
                            </Tooltip>
                            <PopoverContent side="top" className="w-auto min-w-[130px] p-2">
                              <p className="text-xs mb-1.5 font-medium">{t("locMap.confirmDeleteZone", { code: zone.zoneCode })}</p>
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => setConfirmZoneCode(null)}
                                  className="text-[11px] px-2 py-0.5 rounded hover:bg-accent"
                                >
                                  {t("locMap.cancelSmall")}
                                </button>
                                <button
                                  onClick={() => handleZoneDelete(zone.zoneCode)}
                                  className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t("locMap.delete")}
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </>
                    )}
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {t("locMap.zoneOccupied", { occupied, total: allBins.length })}{full > 0 ? ` · ${t("locMap.zoneFull", { count: full })}` : ""}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {zone.shelves.map((shelf) => (
                    <div key={shelf.shelfCode}>
                      <button
                        type="button"
                        onClick={() => openZoom({ zoneCode: zone.zoneCode, shelfCode: shelf.shelfCode })}
                        className="text-[10px] text-muted-foreground mb-1 hover:text-foreground transition-colors text-left cursor-pointer"
                      >
                      {t("locMap.shelfLabel", { code: shelf.shelfCode })}
                        <span className="text-muted-foreground/50 ml-1">{t("locMap.binCountCompact", { count: shelf.bins.length })}</span>
                      </button>
                      <div
                        className="flex flex-wrap items-center gap-3"
                        onDragOver={(e) => { e.preventDefault() }}
                      >
                        {shelf.bins.map((bin) => {
                          const detail = {
                            id: bin.id,
                            zoneCode: zone.zoneCode,
                            fullCode: bin.fullCode,
                            binCode: bin.binCode,
                            productCount: bin.productCount,
                            maxCapacity: bin.maxCapacity,
                            productSkuList: bin.productSkuList,
                            boxCount: bin.boxCount,
                            boxCodes: bin.boxCodes,
                            products: bin.products,
                          }
                          const active = isBinActive(detail)
                          const color = binColor(bin.productCount, bin.maxCapacity)
                          const isDragSource = dragSource?.bin.id === bin.id
                          const dropDisabled = dragSource != null && (
                            detail.zoneCode !== dragSource.zoneCode ||
                            (bin.maxCapacity != null && bin.productCount >= bin.maxCapacity)
                          )
                          return (
                            <div
                              key={bin.id}
                              className="relative"
                              draggable={managing && active && bin.productCount > 0}
                              onDragStart={() => { handleDragStart(detail) }}
                              onDrop={() => { handleDrop(detail) }}
                              onDragEnd={() => { setDragSource(null) }}
                            >
                              {managing ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        id={"bin-" + bin.id}
                                        onClick={() => { if (dragSource) handleDrop(detail); else openDetail(detail) }}
                                        className={`flex flex-col items-center justify-center rounded border px-1.5 py-1 cursor-pointer transition-all hover:shadow-sm ${color.bg} ${color.border} hover:ring-1 hover:ring-ring ${!active ? "opacity-40 saturate-0 ring-1 ring-destructive/40 border-destructive/60" : ""} ${isDragSource ? "ring-2 ring-primary opacity-60" : ""} ${highlightBinId === bin.id ? "ring-2 ring-amber-400" : ""} ${dropDisabled ? "cursor-not-allowed opacity-40" : ""}`}
                                        style={{ minWidth: "4rem", minHeight: "2.75rem" }}
                                      >
<span className="text-[10px] font-mono font-semibold leading-tight">
  {bin.binCode}
  {bin.boxCount > 0 && (
    <span className="ml-1 rounded-sm bg-amber-100 px-1 text-[8px] font-semibold leading-3 align-middle text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" title={bin.boxCodes.join(", ")}>
      {bin.boxCount}
    </span>
  )}
</span>
                                        <span className={`text-[10px] leading-tight ${color.text}`}>
                                          {bin.productCount}{bin.maxCapacity != null ? ` (${Math.round((bin.productCount / bin.maxCapacity) * 100)}%)` : ""}
                                        </span>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[11px]">
                                      <p className="font-mono font-semibold">{bin.fullCode}</p>
                                      <p>{t("locMap.productCountLabel", { count: bin.productCount })}</p>
                                      <p>{t("locMap.boxesInBin", { count: bin.boxCount })}</p>
                                      <p className="text-muted-foreground">{active && bin.productCount > 0 ? t("locMap.dragToMove") : t("locMap.clickToManage")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {active && bin.productCount > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDragStart(detail) }}
                                          className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors cursor-pointer"
                                        >
                                          <GripVertical className="size-2.5 text-muted-foreground" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-[11px]">{t("locMap.moveProducts")}</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {!active && detail.productCount === 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleReactivateBin(detail)
                                          }}
                                          className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors"
                                        >
                                          <Undo2 className="size-2.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-[11px]">
                                        {t("locMap.reactivate")}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {detail.productCount > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => e.stopPropagation()}
                                          className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm opacity-30 cursor-not-allowed"
                                          disabled
                                        >
                                          <X className="size-2.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-[11px]">
                                        {t("locMap.hasProducts")}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Popover
                                      open={confirmBinId === bin.id}
                                      onOpenChange={(o) => setConfirmBinId(o ? bin.id : null)}
                                    >
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <PopoverTrigger asChild>
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors cursor-pointer"
                                            >
                                              <X className="size-2.5" />
                                            </button>
                                          </PopoverTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-[11px]">
                                          {isBinActive(detail) ? t("locMap.deactivate") : t("locMap.delete")}
                                        </TooltipContent>
                                      </Tooltip>
                                      <PopoverContent side="top" className="w-auto min-w-[130px] p-2">
                                        {isBinActive(detail) ? (
                                          <>
                                            <p className="text-xs mb-1.5 font-medium">
                                              {t("locMap.deactivateConfirm", { code: bin.binCode })}
                                            </p>
                                            <div className="flex gap-1 justify-end">
                                              <button
                                                onClick={() => setConfirmBinId(null)}
                                                className="text-[11px] px-2 py-0.5 rounded hover:bg-accent"
                                              >
                                                {t("common.cancel")}
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setConfirmBinId(null)
                                                  handleDeactivateBin(detail)
                                                }}
                                                className="text-[11px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                                              >
                                                {t("locMap.deactivate")}
                                              </button>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-xs mb-1.5 font-medium">
                                              {t("locMap.deleteConfirm", { code: bin.binCode })}
                                            </p>
                                            <div className="flex gap-1 justify-end">
                                              <button
                                                onClick={() => setConfirmBinId(null)}
                                                className="text-[11px] px-2 py-0.5 rounded hover:bg-accent"
                                              >
                                                {t("common.cancel")}
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleBinDelete(detail)
                                                }}
                                                className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                {t("locMap.delete")}
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        id={"bin-" + bin.id}
                                        onClick={() => openDetail(detail)}
                                        className={`flex flex-col items-center justify-center rounded border px-1.5 py-1 cursor-pointer transition-shadow hover:shadow-sm ${color.bg} ${color.border} hover:ring-1 hover:ring-ring ${highlightBinId === bin.id ? "ring-2 ring-amber-400" : ""}`}
                                        style={{ minWidth: "4rem", minHeight: "2.75rem" }}
                                      >
<span className="text-[10px] font-mono font-semibold leading-tight">
  {bin.binCode}
  {bin.boxCount > 0 && (
    <span className="ml-1 rounded-sm bg-amber-100 px-1 text-[8px] font-semibold leading-3 align-middle text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" title={bin.boxCodes.join(", ")}>
      {bin.boxCount}
    </span>
  )}
</span>
                                        <span className={`text-[10px] leading-tight ${color.text}`}>
                                          {bin.productCount}{bin.maxCapacity != null ? ` (${Math.round((bin.productCount / bin.maxCapacity) * 100)}%)` : ""}
                                        </span>
                                      </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[11px]">
                                    <p className="font-mono font-semibold">{bin.fullCode}</p>
                                    <p>{t("locMap.productCountLabel", { count: bin.productCount })}</p>
                                    <p>{t("locMap.boxesInBin", { count: bin.boxCount })}</p>
                                    <p className="text-muted-foreground">{t("locMap.clickToManage")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          )
                        })}

                        {managing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => autoAddBin(zone.zoneCode, shelf.shelfCode)}
                                className="flex items-center justify-center rounded border border-dashed border-blue-200 dark:border-blue-900 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                                style={{ width: "3.5rem", height: "2.25rem" }}
                              >
                                <Plus className="size-3.5 text-blue-400 dark:text-blue-300" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px]">
                              {t("locMap.addBin")}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}

                  {managing && (
                    <div className="pt-1 border-t border-dashed border-blue-200 dark:border-blue-900">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => autoAddShelf(zone.zoneCode)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:text-blue-300 dark:hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            <Plus className="size-3" /> {t("locMap.addShelf")}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            {t("locMap.addNewShelf")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
                        {managing && isLast && (
                          <button
                            onClick={handleAddZone}
                            className="rounded-lg border-2 border-dashed bg-card/50 p-3 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer min-h-[120px]"
                          >
                            <Plus className="size-5" />
                            <span className="text-sm font-medium">{t("locMap.addZone")}</span>
                          </button>
                        )}
                      </div>
                      {!isLast && (
                        <div className="relative my-3">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-dashed border-muted-foreground/20" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-card px-2 text-[10px] text-muted-foreground/40 font-medium tracking-wider uppercase">{t("locMap.aisle")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
                return rows
              })()}
            </div>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[480px]" hideClose>
          <SheetHeader>
            <SheetTitle>{selectedBin?.fullCode}</SheetTitle>
            <SheetDescription>{t("locMap.binInfo")}</SheetDescription>
          </SheetHeader>

          {selectedBin && (
            <div className="px-4 py-4 space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("locMap.products")}</span>
                  <span className="font-medium">
                    {selectedBin.maxCapacity != null
                      ? t("locMap.capacityFraction", { count: selectedBin.productCount, max: selectedBin.maxCapacity })
                      : t("locMap.productCount", { count: selectedBin.productCount })}
                  </span>
                </div>
                {selectedBin.maxCapacity != null && selectedBin.maxCapacity > 0 && (
                  <div className="w-full h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        selectedBin.productCount >= selectedBin.maxCapacity
                          ? "bg-destructive"
                          : selectedBin.productCount / selectedBin.maxCapacity >= 0.8
                            ? "bg-amber-500"
                            : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, (selectedBin.productCount / selectedBin.maxCapacity) * 100)}%` }}
                    />
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground shrink-0">{t("locMap.capacityMax")}</span>
                  {managing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        className="w-24 h-8 text-right"
                        placeholder={t("locMap.capacityUnlimited")}
                        value={capacityDraft}
                        onChange={(e) => setCapacityDraft(e.target.value)}
                        disabled={capacitySaving}
                      />
                      <Button size="sm" variant="outline" onClick={handleUpdateCapacity} disabled={capacitySaving}>
                        {t("locMap.capacitySave")}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium">
                      {selectedBin.maxCapacity != null ? selectedBin.maxCapacity : t("locMap.capacityUnlimited")}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("locMap.status")}</span>
                  <span className={isBinActive(selectedBin) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                    {isBinActive(selectedBin) ? t("locMap.active") : t("locMap.inactive")}
                  </span>
                </div>
                {looseProducts.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">
                      {t("locMap.looseProducts", { count: looseCount })}
                    </span>
                    <ul className="mt-1 space-y-1">
                      {looseProducts.map((p) => productRow(p, "loose-" + p.productId))}
                    </ul>
                  </div>
                )}
                {boxGroups.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">
                      {t("locMap.inBoxes", { count: boxGroups.length })}
                    </span>
                    <ul className="mt-1 space-y-1">
                      {boxGroups.map((g) => {
                        const boxKey = "box-" + g.boxId
                        const expanded = expandedProducts.has(boxKey)
                        return (
                          <li key={boxKey}>
                            <button
                              type="button"
                              className="w-full flex items-center justify-between gap-2 rounded px-1.5 py-1 text-left hover:bg-muted/60"
                              onClick={() => toggleExpand(boxKey)}
                            >
                              <span className="flex items-center gap-1 truncate">
                                {expanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <span className="font-mono font-semibold">{g.boxCode}</span>
                                {g.boxType && (
                                  <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                                    {t(`box.boxTypes.${g.boxType}`)}
                                  </span>
                                )}
                              </span>
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium tabular-nums text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                                {g.total}
                              </span>
                            </button>
                            {expanded && (
                              <ul className="mt-0.5 ml-5 space-y-0.5">
                                {g.products.map((p) => productRow(p, `box-${g.boxId}-${p.productId}`))}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                {!selectedBin.products && selectedBin.productSkuList && selectedBin.productSkuList.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">{t("locMap.productsInBin")}</span>
                    <ul className="mt-1 space-y-0.5">
                      {selectedBin.productSkuList.map((sku) => (
                        <li key={sku} className="text-xs font-mono text-foreground/80">
                          {sku}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(selectedBin.boxCount ?? 0) > 0 && boxGroups.length === 0 && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">
                      {t("locMap.boxesInBin", { count: selectedBin.boxCount ?? 0 })}
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {(selectedBin.boxCodes ?? []).map((code) => (
                        <li key={code} className="text-xs font-mono text-amber-700 dark:text-amber-300">
                          {code}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline" className="w-full">
                {t("common.close")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={relocateTarget != null}
        onOpenChange={(v) => { if (!v) handleRelocateCancel() }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("locMap.relocateTitle")}</DialogTitle>
            <DialogDescription>
              {t("locMap.relocateDesc", { source: relocateTarget?.source.fullCode, sourceCount: relocateTarget?.source.productCount, dest: relocateTarget?.dest.fullCode, destCount: relocateTarget?.dest.productCount })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">{t("locMap.quantity")}:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRelocateQuantity(Math.max(1, relocateQuantity - 1))}
                  className="inline-flex items-center justify-center size-6 rounded border hover:bg-accent transition-colors cursor-pointer"
                  disabled={relocateQuantity <= 1}
                >
                  <Minus className="size-3" />
                </button>
                <Input
                  type="number"
                  className="w-16 h-7 text-center text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={relocateQuantity}
                  min={1}
                  max={relocateTarget?.source.productCount ?? 0}
                   onChange={(e) => {
                     const raw = e.target.value
                     if (raw === "" || raw === "0") {
                       setRelocateQuantity(0)
                       return
                     }
                     const v = parseInt(raw, 10)
                     if (!isNaN(v)) setRelocateQuantity(v)
                   }}
                   onBlur={() => setRelocateQuantity(prev =>
                     Math.max(1, Math.min(prev || 1, relocateTarget?.source.productCount ?? 1))
                   )}
                />
                <button
                  onClick={() => setRelocateQuantity(Math.min(relocateTarget?.source.productCount ?? 1, relocateQuantity + 1))}
                  className="inline-flex items-center justify-center size-6 rounded border hover:bg-accent transition-colors cursor-pointer"
                  disabled={relocateQuantity >= (relocateTarget?.source.productCount ?? 1)}
                >
                  <Plus className="size-3" />
                </button>
                <button
                  onClick={() => setRelocateQuantity(relocateTarget?.source.productCount ?? 0)}
                  className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-accent transition-colors cursor-pointer text-muted-foreground"
                >
                  {t("locMap.max")}
                </button>
              </div>
            </div>
            {relocateTarget && (
              <p className="text-[11px] text-muted-foreground text-center">
                {t("locMap.relocateRemaining", { count: relocateTarget.source.productCount - relocateQuantity, code: relocateTarget.source.fullCode })} · {t("locMap.relocateAfter", { count: relocateTarget.dest.productCount + relocateQuantity, code: relocateTarget.dest.fullCode })}
              </p>
            )}
          </div>
          <div className="text-center pb-1">
            <span className="text-[11px] text-muted-foreground">
              {t("locMap.autoCancel", { countdown: relocateCountdown })}
            </span>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleRelocateCancel}>{t("common.cancel")}</Button>
            <Button onClick={handleRelocateConfirm}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


