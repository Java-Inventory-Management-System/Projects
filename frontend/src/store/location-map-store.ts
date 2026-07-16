import { create } from "zustand"
import type { LocationMapData } from "@/utils/types"
import { getLocationMap } from "@/features/stock/services/location-service"

export type FilterMode = "all" | "empty" | "stocked" | "full"

export interface DetailBin {
  id: number
  zoneCode: string
  fullCode: string
  binCode: string
  productCount: number
}

export const LEVELS = [
  { threshold: 0, label: "Trống", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-400" },
  { threshold: 1, label: "Ít", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-600" },
  { threshold: 10, label: "Có hàng", bg: "bg-blue-200", border: "border-blue-400", text: "text-blue-700" },
  { threshold: 50, label: "Đầy", bg: "bg-blue-300", border: "border-blue-500", text: "text-blue-800" },
] as const

export function binColor(count: number) {
  if (count === 0) return LEVELS[0]
  if (count < 10) return LEVELS[1]
  if (count < 50) return LEVELS[2]
  return LEVELS[3]
}

export const FILTERS: { key: FilterMode; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "empty", label: "Còn trống" },
  { key: "stocked", label: "Có hàng" },
  { key: "full", label: "Đầy" },
]

function nextCode(existing: string[]): string {
  const nums = existing.map((c) => parseInt(c, 10)).filter((n) => !Number.isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return String(max + 1).padStart(2, "0")
}

interface LocationMapState {
  data: LocationMapData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  fetchMap: (isRefresh?: boolean) => void
  setData: (data: LocationMapData | null) => void
  patchZones: (updater: (prev: LocationMapData) => LocationMapData) => void
}

export const useLocationMapStore = create<LocationMapState>((set) => ({
  data: null,
  loading: true,
  refreshing: false,
  error: null,

  fetchMap: (isRefresh?: boolean) => {
    if (isRefresh) set({ refreshing: true })
    else set({ loading: true })
    set({ error: null })
    getLocationMap()
      .then((data) => set({ data }))
      .catch((err) => set({ error: (err as Error).message || "Không thể tải bản đồ kho" }))
      .finally(() => set({ loading: false, refreshing: false }))
  },

  setData: (data) => set({ data }),

  patchZones: (updater) =>
    set((state) => {
      if (!state.data) return state
      return { data: updater(state.data) }
    }),
}))
