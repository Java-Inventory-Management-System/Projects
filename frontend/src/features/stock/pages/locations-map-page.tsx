import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  RefreshCw,
  Search,
  Plus,
  X,
  Settings2,
  Undo2,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import type { FilterMode } from "@/store/location-map-store"
import { LEVELS, FILTERS, binColor } from "@/store/location-map-store"
import { useLocationMapPage } from "@/features/stock/hooks/use-location-map-page"
import { toast } from "@/utils/toast"

export function LocationsMapPage() {
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
  } = useLocationMapPage()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Bản đồ kho</h1>
          {!loading && data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.zones.length} khu vực · {totalBins} vị trí
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={managing ? "default" : "outline"}
            onClick={() => setManaging((m: boolean) => !m)}
          >
            <Settings2 className="size-3.5 mr-1" />
            {managing ? "Xong" : "Quản lý vị trí"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchMap(true)} disabled={loading || refreshing}>
            <RefreshCw className={`size-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-48">
          <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm bin..."
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
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        {LEVELS.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className={`inline-block size-3 rounded-sm ${c.bg} ${c.border} border`} />
            {c.label}
          </span>
        ))}
      </div>

      {loading ? (
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
            <RefreshCw className="size-3 mr-1" /> Thử lại
          </Button>
        </div>
      ) : filteredZones.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          {search || filter !== "all" ? "Không tìm thấy bin nào phù hợp" : "Chưa có vị trí nào trong kho"}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredZones.map((zone) => {
            const allBins = zone.shelves.flatMap((s) => s.bins)
            const occupied = allBins.filter((b) => b.productCount > 0).length
            const full = allBins.filter((b) => b.productCount >= 50).length
            const hasProducts = allBins.some((b) => b.productCount > 0)
            return (
              <div key={zone.zoneCode} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-semibold">Khu {zone.zoneCode}</h2>
                    {managing && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => autoAddShelf(zone.zoneCode)}
                              className="inline-flex items-center justify-center size-4 rounded hover:bg-accent transition-colors"
                            >
                              <Plus className="size-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">Thêm kệ</TooltipContent>
                        </Tooltip>
                        {hasProducts ? (
                          <button
                            onClick={() => toast.error("Không thể xóa khu đang có sản phẩm")}
                            className="inline-flex items-center justify-center size-4 rounded hover:bg-accent transition-colors opacity-30 cursor-not-allowed"
                          >
                            <X className="size-3" />
                          </button>
                        ) : (
                          <Popover open={confirmZoneCode === zone.zoneCode} onOpenChange={(o) => setConfirmZoneCode(o ? zone.zoneCode : null)}>
                            <PopoverTrigger asChild>
                              <button className="inline-flex items-center justify-center size-4 rounded hover:bg-accent transition-colors">
                                <X className="size-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="w-auto min-w-[130px] p-2">
                              <p className="text-xs mb-1.5 font-medium">Xóa khu {zone.zoneCode}?</p>
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => setConfirmZoneCode(null)} className="text-[11px] px-2 py-0.5 rounded hover:bg-accent">Hủy</button>
                                <button onClick={() => handleZoneDelete(zone.zoneCode)} className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa</button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {occupied}/{allBins.length} có hàng{full > 0 ? ` · ${full} đầy` : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {zone.shelves.map((shelf) => (
                    <div key={shelf.shelfCode}>
                      <p className="text-[10px] text-muted-foreground mb-1">
                        Kệ {shelf.shelfCode}
                        <span className="text-muted-foreground/50 ml-1">({shelf.bins.length} ngăn)</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {shelf.bins.map((bin) => {
                          const detail = { id: bin.id, zoneCode: zone.zoneCode, fullCode: bin.fullCode, binCode: bin.binCode, productCount: bin.productCount }
                          const active = isBinActive(detail)
                          const color = binColor(bin.productCount)
                          return (
                            <div key={bin.id} className="relative">
                              {managing ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => openDetail(detail)}
                                        className={`flex flex-col items-center justify-center rounded border px-1.5 py-1 cursor-pointer transition-all hover:shadow-sm ${color.bg} ${color.border} hover:ring-1 hover:ring-ring ${!active ? "opacity-40 saturate-0 ring-1 ring-destructive/40 border-destructive/60" : ""}`}
                                        style={{ minWidth: "3.5rem", minHeight: "2.25rem" }}
                                      >
                                        <span className="text-[9px] font-mono font-semibold leading-tight">{bin.binCode}</span>
                                        <span className={`text-[9px] leading-tight ${color.text}`}>{bin.productCount}</span>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[11px]">
                                      <p className="font-mono font-semibold">{bin.fullCode}</p>
                                      <p>{bin.productCount} sản phẩm</p>
                                      <p className="text-muted-foreground">Nhấp để quản lý</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {!active && detail.productCount === 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleReactivateBin(detail) }}
                                          className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors"
                                        >
                                          <Undo2 className="size-2.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-[11px]">Kích hoạt lại</TooltipContent>
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
                                      <TooltipContent side="top" className="text-[11px]">Có sản phẩm</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Popover open={confirmBinId === bin.id} onOpenChange={(o) => setConfirmBinId(o ? bin.id : null)}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <PopoverTrigger asChild>
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors"
                                            >
                                              <X className="size-2.5" />
                                            </button>
                                          </PopoverTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-[11px]">{isBinActive(detail) ? "Vô hiệu hóa" : "Xóa"}</TooltipContent>
                                      </Tooltip>
                                      <PopoverContent side="top" className="w-auto min-w-[130px] p-2">
                                        {isBinActive(detail) ? (
                                          <>
                                            <p className="text-xs mb-1.5 font-medium">Vô hiệu hóa <span className="font-mono">{bin.binCode}</span>?</p>
                                            <div className="flex gap-1 justify-end">
                                              <button onClick={() => setConfirmBinId(null)} className="text-[11px] px-2 py-0.5 rounded hover:bg-accent">Hủy</button>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmBinId(null); handleDeactivateBin(detail) }}
                                                className="text-[11px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                                              >Vô hiệu hóa</button>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-xs mb-1.5 font-medium">Xóa <span className="font-mono">{bin.binCode}</span>?</p>
                                            <div className="flex gap-1 justify-end">
                                              <button onClick={() => setConfirmBinId(null)} className="text-[11px] px-2 py-0.5 rounded hover:bg-accent">Hủy</button>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleBinDelete(detail) }}
                                                className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >Xóa</button>
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
                                      onClick={() => openDetail(detail)}
                                      className={`flex flex-col items-center justify-center rounded border px-1.5 py-1 cursor-pointer transition-shadow hover:shadow-sm ${color.bg} ${color.border} hover:ring-1 hover:ring-ring`}
                                      style={{ minWidth: "3.5rem", minHeight: "2.25rem" }}
                                    >
                                      <span className="text-[9px] font-mono font-semibold leading-tight">{bin.binCode}</span>
                                      <span className={`text-[9px] leading-tight ${color.text}`}>{bin.productCount}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[11px]">
                                    <p className="font-mono font-semibold">{bin.fullCode}</p>
                                    <p>{bin.productCount} sản phẩm</p>
                                    <p className="text-muted-foreground">Nhấp để quản lý</p>
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
                                className="flex items-center justify-center rounded border border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-100 transition-colors"
                                style={{ width: "3.5rem", height: "2.25rem" }}
                              >
                                <Plus className="size-3.5 text-blue-400" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px]">Thêm ngăn</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}

                  {managing && (
                    <div className="pt-1 border-t border-dashed border-blue-200">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => autoAddShelf(zone.zoneCode)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <Plus className="size-3" /> Thêm kệ
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[11px]">Thêm kệ mới</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {managing && (
            <button
              onClick={handleAddZone}
              className="rounded-lg border-2 border-dashed bg-card/50 p-3 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer min-h-[120px]"
            >
              <Plus className="size-5" />
              <span className="text-sm font-medium">Thêm khu</span>
            </button>
          )}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[360px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>{selectedBin?.fullCode}</SheetTitle>
            <SheetDescription>Thông tin vị trí</SheetDescription>
          </SheetHeader>

          {selectedBin && (
            <div className="py-4 space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sản phẩm</span>
                  <span className="font-medium">{selectedBin.productCount} đơn vị</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <span className={isBinActive(selectedBin) ? "text-green-600" : "text-muted-foreground"}>
                    {isBinActive(selectedBin) ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline" className="w-full">Đóng</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
