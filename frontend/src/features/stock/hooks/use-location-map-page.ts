import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLocationMap } from "@/hooks/use-location-map"
import type { LocationMapData } from "@/utils/types"
import type { DetailBin, FilterMode } from "@/features/stock/utils/location-map-utils"
import { nextCode } from "@/features/stock/utils/location-map-utils"
import { createLocation, deleteLocation, relocateProductUnits } from "@/services/location-service"
import { toast } from "@/utils/toast"

export function useLocationMapPage() {
  const qc = useQueryClient()
  const { data, isLoading, isFetching, error, refetch } = useLocationMap()

  const searchToastShown = useRef(false)

  function patchZones(updater: (prev: LocationMapData) => LocationMapData) {
    qc.setQueryData<LocationMapData>(["location-map"], (prev) => prev ? updater(prev) : prev)
  }

  const totalBins = useMemo(() => {
    if (!data) return 0
    return data.zones.reduce((sum, z) => sum + z.shelves.reduce((s, sh) => s + sh.bins.length, 0), 0)
  }, [data])

  const [search, _setSearch] = useState("")
  const [filter, setFilter] = useState<FilterMode>("all")
  const [selectedBin, setSelectedBin] = useState<DetailBin | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [managing, setManaging] = useState(false)
  const [confirmBinId, setConfirmBinId] = useState<number | null>(null)
  const [confirmZoneCode, setConfirmZoneCode] = useState<string | null>(null)
  const [deactivatedIds, setDeactivatedIds] = useState<Record<number, true>>({})
  const [zoomedShelf, _setZoomedShelf] = useState<{ zoneCode: string; shelfCode: string | null } | null>(null)
  const [zoomStage, setZoomStage] = useState<"idle" | "entering" | "visible" | "exiting">("idle")
  const [dragSource, setDragSource] = useState<{ bin: DetailBin; zoneCode: string } | null>(null)
  const [relocateTarget, setRelocateTarget] = useState<{ source: DetailBin; dest: DetailBin } | null>(null)
  const [relocateCountdown, setRelocateCountdown] = useState(0)
  const [relocateQuantity, setRelocateQuantity] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isZoneZoomed = zoomedShelf != null && zoomedShelf.shelfCode == null

  function setSearch(value: string) {
    if (value && filter !== "all") {
      setFilter("all")
      if (!searchToastShown.current) {
        searchToastShown.current = true
        toast.info("Đã bỏ bộ lọc để hiển thị kết quả tìm kiếm")
      }
    }
    if (!value) searchToastShown.current = false
    _setSearch(value)
  }

  function openZoom(target: { zoneCode: string; shelfCode: string | null } | null) {
    if (target == null) {
      setZoomStage("exiting")
      setTimeout(() => {
        setZoomStage("idle")
        _setZoomedShelf(null)
      }, 150)
    } else {
      _setZoomedShelf(target)
      setZoomStage("entering")
      requestAnimationFrame(() => setZoomStage("visible"))
    }
  }

  useEffect(() => {
    if (zoomStage !== "visible") return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") openZoom(null)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [zoomStage])

  useEffect(() => {
    if (!dragSource && !relocateTarget) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (relocateTarget) {
          clearCountdown()
          setRelocateCountdown(0)
          setRelocateTarget(null)
        }
        setDragSource(null)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [dragSource, relocateTarget])

  const filteredZones = useMemo(() => {
    if (!data) return []
    return data.zones
      .map((zone) => {
        if (zoomedShelf && zone.zoneCode !== zoomedShelf.zoneCode) {
          return { ...zone, shelves: [] }
        }
        const shelves = zone.shelves
          .map((shelf) => {
            if (zoomedShelf?.shelfCode && shelf.shelfCode !== zoomedShelf.shelfCode) {
              return { ...shelf, bins: [] }
            }
            const bins = shelf.bins.filter((bin) => {
              if (search) {
                const q = search.toLowerCase()
                const matchesFullCode = bin.fullCode.toLowerCase().includes(q)
                const matchesSku = (bin.productSkuList ?? []).some((s) => s.toLowerCase().includes(q))
                if (!matchesFullCode && !matchesSku) return false
              }
              if (filter === "empty") return bin.productCount === 0
              if (filter === "stocked") return bin.productCount > 0
              if (filter === "full")
                return bin.maxCapacity != null && bin.maxCapacity > 0
                  ? bin.productCount >= bin.maxCapacity
                  : bin.productCount >= 50
              return true
            })
            return { ...shelf, bins }
          })
          .filter((shelf) => {
            if (zoomedShelf && zoomedShelf.shelfCode == null) return true
            return shelf.bins.length > 0
          })
        return { ...zone, shelves }
      })
      .filter((zone) => zone.shelves.length > 0)
  }, [data, search, filter, zoomedShelf])

  const highlightBinId = useMemo(() => {
    if (!search) return null
    const q = search.toLowerCase()
    for (const zone of data?.zones ?? []) {
      for (const shelf of zone.shelves) {
        for (const bin of shelf.bins) {
          const matchesFullCode = bin.fullCode.toLowerCase().includes(q)
          const matchesSku = (bin.productSkuList ?? []).some((s) => s.toLowerCase().includes(q))
          if (matchesFullCode || matchesSku) return bin.id
        }
      }
    }
    return null
  }, [search, data])

  useEffect(() => {
    if (!search || highlightBinId) return
    const timer = setTimeout(() => {
      toast.info("Không tìm thấy sản phẩm này trong kho")
    }, 300)
    return () => clearTimeout(timer)
  }, [search, highlightBinId])

  function isBinActive(bin: DetailBin) {
    return !deactivatedIds[bin.id]
  }

  function openDetail(bin: DetailBin) {
    setSelectedBin(bin)
    setSheetOpen(true)
  }

  function handleDeactivateBin(bin: DetailBin) {
    setDeactivatedIds((prev) => ({ ...prev, [bin.id]: true }))
    toast.success("Đã vô hiệu hóa")
  }

  function handleReactivateBin(bin: DetailBin) {
    setDeactivatedIds((prev) => {
      const next = { ...prev }
      delete next[bin.id]
      return next
    })
    toast.success("Đã kích hoạt lại")
  }

  function handleAddZone() {
    const existing = (data?.zones ?? []).map((z) => z.zoneCode)
    const zoneCode = nextCode(existing)
    const shelfCode = "01"
    const binCode = "01"
    const newBin = {
      id: -Date.now(),
      fullCode: `${zoneCode}-${shelfCode}-${binCode}`,
      binCode,
      productCount: 0,
      maxCapacity: null,
      productSkuList: [],
    }
    patchZones((prev) => ({ ...prev, zones: [...prev.zones, { zoneCode, shelves: [{ shelfCode, bins: [newBin] }] }] }))
    createLocation({ zoneCode, shelfCode, binCode })
      .then((res) => {
        patchZones((prev) => ({
          ...prev,
          zones: prev.zones.map((z) =>
            z.zoneCode !== zoneCode
              ? z
              : {
                  ...z,
                  shelves: z.shelves.map((s) =>
                    s.shelfCode !== shelfCode
                      ? s
                      : { ...s, bins: s.bins.map((b) => (b.id === newBin.id ? { ...b, id: res.id } : b)) },
                  ),
                },
          ),
        }))
      })
      .catch((err) => {
        patchZones((prev) => ({ ...prev, zones: prev.zones.filter((z) => z.zoneCode !== zoneCode) }))
        toast.error((err as Error).message || "Thêm khu thất bại")
      })
  }

  function handleBinDelete(target: DetailBin) {
    if (target.productCount > 0) {
      toast.error("Vị trí đang có sản phẩm, không thể xóa")
      return
    }
    setConfirmBinId(null)
    setSheetOpen(false)
    patchZones((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.zoneCode !== target.zoneCode
          ? z
          : {
              ...z,
              shelves: z.shelves.map((s) =>
                s.shelfCode !== target.fullCode.split("-")[1]
                  ? s
                  : { ...s, bins: s.bins.filter((b) => b.id !== target.id) },
              ),
            },
      ),
    }))
    deleteLocation(target.id).catch((err) => {
      toast.error(err?.response?.data?.message || err?.message || "Xóa thất bại")
      refetch()
    })
  }

  function handleZoneDelete(zoneCode: string) {
    const zone = data?.zones.find((z) => z.zoneCode === zoneCode)
    if (!zone) return
    setConfirmZoneCode(null)
    patchZones((prev) => ({ ...prev, zones: prev.zones.filter((z) => z.zoneCode !== zoneCode) }))
    const ids = zone.shelves.flatMap((s) => s.bins.map((b) => b.id))
    Promise.all(ids.map((id) => deleteLocation(id).catch(() => {}))).then(() => toast.success(`Đã xóa khu ${zoneCode}`))
  }

  async function autoAddBin(zoneCode: string, shelfCode: string) {
    const zone = data?.zones.find((z) => z.zoneCode === zoneCode)
    const shelf = zone?.shelves.find((s) => s.shelfCode === shelfCode)
    const existing = (shelf?.bins ?? []).map((b) => b.binCode)
    const binCode = nextCode(existing)
    const newBin = {
      id: -Date.now(),
      fullCode: `${zoneCode}-${shelfCode}-${binCode}`,
      binCode,
      productCount: 0,
      maxCapacity: null,
      productSkuList: [],
    }
    patchZones((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.zoneCode !== zoneCode
          ? z
          : {
              ...z,
              shelves: z.shelves.map((s) => (s.shelfCode !== shelfCode ? s : { ...s, bins: [...s.bins, newBin] })),
            },
      ),
    }))
    try {
      const res = await createLocation({ zoneCode, shelfCode, binCode })
      patchZones((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.zoneCode !== zoneCode
            ? z
            : {
                ...z,
                shelves: z.shelves.map((s) =>
                  s.shelfCode !== shelfCode
                    ? s
                    : { ...s, bins: s.bins.map((b) => (b.id === newBin.id ? { ...b, id: res.id } : b)) },
                ),
              },
        ),
      }))
    } catch (err) {
      patchZones((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.zoneCode !== zoneCode
            ? z
            : {
                ...z,
                shelves: z.shelves.map((s) =>
                  s.shelfCode !== shelfCode ? s : { ...s, bins: s.bins.filter((b) => b.id !== newBin.id) },
                ),
              },
        ),
      }))
      toast.error((err as Error).message || "Thêm thất bại")
    }
  }

  async function autoAddShelf(zoneCode: string) {
    const zone = data?.zones.find((z) => z.zoneCode === zoneCode)
    const existingShelves = (zone?.shelves ?? []).map((s) => s.shelfCode)
    const shelfCode = nextCode(existingShelves)
    const binCode = "01"
    const newBin = {
      id: -Date.now(),
      fullCode: `${zoneCode}-${shelfCode}-${binCode}`,
      binCode,
      productCount: 0,
      maxCapacity: null,
      productSkuList: [],
    }
    patchZones((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.zoneCode !== zoneCode ? z : { ...z, shelves: [...z.shelves, { shelfCode, bins: [newBin] }] },
      ),
    }))
    try {
      const res = await createLocation({ zoneCode, shelfCode, binCode })
      patchZones((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.zoneCode !== zoneCode
            ? z
            : {
                ...z,
                shelves: z.shelves.map((s) =>
                  s.shelfCode !== shelfCode
                    ? s
                    : { ...s, bins: s.bins.map((b) => (b.id === newBin.id ? { ...b, id: res.id } : b)) },
                ),
              },
        ),
      }))
    } catch (err) {
      patchZones((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.zoneCode !== zoneCode ? z : { ...z, shelves: z.shelves.filter((s) => s.shelfCode !== shelfCode) },
        ),
      }))
      toast.error((err as Error).message || "Thêm thất bại")
    }
  }

  const zoomedZone = useMemo(() => {
    if (!zoomedShelf || !data) return null
    return data.zones.find((z) => z.zoneCode === zoomedShelf.zoneCode) ?? null
  }, [zoomedShelf, data])

  const zoomedShelfData = useMemo(() => {
    if (!zoomedZone || !zoomedShelf?.shelfCode) return null
    return zoomedZone.shelves.find((s) => s.shelfCode === zoomedShelf.shelfCode) ?? null
  }, [zoomedZone, zoomedShelf])

  function handleDragStart(bin: DetailBin) {
    setDragSource({ bin, zoneCode: bin.zoneCode })
  }

  function handleDrop(destBin: DetailBin) {
    if (!dragSource) return
    if (dragSource.bin.id === destBin.id) { setDragSource(null); return }
    if (dragSource.zoneCode !== destBin.zoneCode) return
    if (destBin.maxCapacity != null && destBin.productCount >= destBin.maxCapacity) return
    setRelocateTarget({ source: dragSource.bin, dest: destBin })
    setRelocateQuantity(dragSource.bin.productCount)
    setDragSource(null)
  }

  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }

  /** Nhánh A: huỷ/hết giờ → revert UI local, KHÔNG gọi API */
  function handleRelocateCancel() {
    clearCountdown()
    setRelocateCountdown(0)
    setRelocateTarget(null)
    setRelocateQuantity(0)
    setDragSource(null)
  }

  /** Nhánh B: bấm OK → gọi API, nếu lỗi revert + toast cụ thể */
  async function handleRelocateConfirm() {
    clearCountdown()
    setRelocateCountdown(0)
    const target = relocateTarget
    setRelocateTarget(null)
    if (!target) return

    const sourceId = target.source.id
    const destId = target.dest.id

    try {
      await relocateProductUnits(sourceId, destId, relocateQuantity || undefined)
      toast.success(`Đã di chuyển ${relocateQuantity} sản phẩm từ ${target.source.fullCode} sang ${target.dest.fullCode}`)
      qc.invalidateQueries({ queryKey: ["location-map"] })
      qc.invalidateQueries({ queryKey: ["product-units"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as Error).message
        ?? "Di chuyển thất bại"
      toast.error(message)
      refetch()
    }
  }

  /** Bắt đầu countdown khi relocateTarget thay đổi */
  useEffect(() => {
    if (!relocateTarget) {
      setRelocateCountdown(0)
      return
    }
    setRelocateCountdown(20)
    countdownRef.current = setInterval(() => {
      setRelocateCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown()
          setRelocateTarget(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return clearCountdown
  }, [relocateTarget])

  return {
    data,
    loading: isLoading,
    refreshing: isFetching,
    error: error?.message ?? null,
    fetchMap: () => refetch(),
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
    deactivatedIds,
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
    isZoneZoomed,
    zoomedZone,
    zoomedShelfData,
    dragSource,
    handleDragStart,
    handleDrop,
    relocateTarget,
    relocateCountdown,
    relocateQuantity,
    setRelocateQuantity,
    handleRelocateCancel,
    handleRelocateConfirm,
    highlightBinId,
  }
}
