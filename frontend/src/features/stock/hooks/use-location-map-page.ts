import { useEffect, useMemo, useState } from "react"
import { useLocationMapStore } from "@/store/location-map-store"
import type { DetailBin, FilterMode } from "@/store/location-map-store"
import { createLocation, deleteLocation } from "@/features/stock/services/location-service"
import { toast } from "@/utils/toast"

function nextCode(existing: string[]): string {
  const nums = existing.map((c) => parseInt(c, 10)).filter((n) => !Number.isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return String(max + 1).padStart(2, "0")
}

export function useLocationMapPage() {
  const { data, loading, refreshing, error, fetchMap, patchZones } = useLocationMapStore()

  useEffect(() => { fetchMap() }, [])

  const totalBins = useMemo(() => {
    if (!data) return 0
    return data.zones.reduce((sum, z) => sum + z.shelves.reduce((s, sh) => s + sh.bins.length, 0), 0)
  }, [data])

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterMode>("all")

  const [selectedBin, setSelectedBin] = useState<DetailBin | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [managing, setManaging] = useState(false)

  const [confirmBinId, setConfirmBinId] = useState<number | null>(null)
  const [confirmZoneCode, setConfirmZoneCode] = useState<string | null>(null)
  const [deactivatedIds, setDeactivatedIds] = useState<Record<number, true>>({})

  const filteredZones = useMemo(() => {
    if (!data) return []
    return data.zones
      .map((zone) => {
        const shelves = zone.shelves
          .map((shelf) => {
            const bins = shelf.bins.filter((bin) => {
              if (search && !bin.fullCode.toLowerCase().includes(search.toLowerCase())) return false
              if (filter === "empty") return bin.productCount === 0
              if (filter === "stocked") return bin.productCount > 0
              if (filter === "full") return bin.productCount >= 50
              return true
            })
            return { ...shelf, bins }
          })
          .filter((shelf) => shelf.bins.length > 0)
        return { ...zone, shelves }
      })
      .filter((zone) => zone.shelves.length > 0)
  }, [data, search, filter])

  function isBinActive(bin: DetailBin) { return !deactivatedIds[bin.id] }

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
    const newBin = { id: -Date.now(), fullCode: `${zoneCode}-${shelfCode}-${binCode}`, binCode, productCount: 0 }
    patchZones((prev) => ({ ...prev, zones: [...prev.zones, { zoneCode, shelves: [{ shelfCode, bins: [newBin] }] }] }))
    createLocation({ zoneCode, shelfCode, binCode })
      .then((res) => {
        patchZones((prev) => ({
          ...prev,
          zones: prev.zones.map((z) =>
            z.zoneCode !== zoneCode ? z : { ...z, shelves: z.shelves.map((s) =>
              s.shelfCode !== shelfCode ? s : { ...s, bins: s.bins.map((b) => (b.id === newBin.id ? { ...b, id: res.id } : b)) }
            ) }
          ),
        }))
      })
      .catch((err) => {
        patchZones((prev) => ({ ...prev, zones: prev.zones.filter((z) => z.zoneCode !== zoneCode) }))
        toast.error((err as Error).message || "Thêm khu thất bại")
      })
  }

  function canDeleteBin(bin: DetailBin) { return bin.productCount === 0 && !isBinActive(bin) }

  function handleBinDelete(target: DetailBin) {
    if (!canDeleteBin(target)) {
      if (target.productCount > 0) toast.error("Vị trí đang có sản phẩm, không thể xóa")
      else toast.error("Vui lòng vô hiệu hóa trước khi xóa")
      return
    }
    setConfirmBinId(null)
    setSheetOpen(false)
    patchZones((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.zoneCode !== target.zoneCode ? z : { ...z, shelves: z.shelves.map((s) =>
          s.shelfCode !== target.fullCode.split("-")[1] ? s : { ...s, bins: s.bins.filter((b) => b.id !== target.id) }
        ) }
      ),
    }))
    deleteLocation(target.id).catch((err) => {
      toast.error((err as Error).message || "Xóa thất bại")
      fetchMap(true)
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
    const newBin = { id: -Date.now(), fullCode: `${zoneCode}-${shelfCode}-${binCode}`, binCode, productCount: 0 }
    patchZones((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.zoneCode !== zoneCode ? z : { ...z, shelves: z.shelves.map((s) =>
          s.shelfCode !== shelfCode ? s : { ...s, bins: [...s.bins, newBin] }
        ) }
      ),
    }))
    try {
      const res = await createLocation({ zoneCode, shelfCode, binCode })
      patchZones((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.zoneCode !== zoneCode ? z : { ...z, shelves: z.shelves.map((s) =>
            s.shelfCode !== shelfCode ? s : { ...s, bins: s.bins.map((b) => (b.id === newBin.id ? { ...b, id: res.id } : b)) }
          ) }
        ),
      }))
    } catch (err) {
      patchZones((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.zoneCode !== zoneCode ? z : { ...z, shelves: z.shelves.map((s) =>
            s.shelfCode !== shelfCode ? s : { ...s, bins: s.bins.filter((b) => b.id !== newBin.id) }
          ) }
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
    const newBin = { id: -Date.now(), fullCode: `${zoneCode}-${shelfCode}-${binCode}`, binCode, productCount: 0 }
    patchZones((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.zoneCode !== zoneCode ? z : { ...z, shelves: [...z.shelves, { shelfCode, bins: [newBin] }] }
      ),
    }))
    try {
      const res = await createLocation({ zoneCode, shelfCode, binCode })
      patchZones((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.zoneCode !== zoneCode ? z : { ...z, shelves: z.shelves.map((s) =>
            s.shelfCode !== shelfCode ? s : { ...s, bins: s.bins.map((b) => (b.id === newBin.id ? { ...b, id: res.id } : b)) }
          ) }
        ),
      }))
    } catch (err) {
      patchZones((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.zoneCode !== zoneCode ? z : { ...z, shelves: z.shelves.filter((s) => s.shelfCode !== shelfCode) }
        ),
      }))
      toast.error((err as Error).message || "Thêm thất bại")
    }
  }

  return {
    data,
    loading,
    refreshing,
    error,
    fetchMap,
    totalBins,
    search, setSearch,
    filter, setFilter,
    selectedBin, sheetOpen, setSheetOpen,
    managing, setManaging,
    confirmBinId, setConfirmBinId,
    confirmZoneCode, setConfirmZoneCode,
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
  }
}
