export type FilterMode = "all" | "empty" | "stocked" | "full"

export interface DetailBin {
  id: number
  zoneCode: string
  fullCode: string
  binCode: string
  productCount: number
  maxCapacity: number | null
}

export const LEVELS = [
  { threshold: 0, label: "Trống", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-400" },
  { threshold: 1, label: "Ít", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-600" },
  { threshold: 10, label: "Có hàng", bg: "bg-blue-200", border: "border-blue-400", text: "text-blue-700" },
  { threshold: 50, label: "Đầy", bg: "bg-blue-300", border: "border-blue-500", text: "text-blue-800" },
] as const

export function binColor(count: number, maxCapacity?: number | null) {
  if (maxCapacity != null && maxCapacity > 0) {
    if (count === 0) return LEVELS[0]
    const pct = count / maxCapacity
    if (pct < 0.5) return LEVELS[1]
    if (pct < 0.9) return LEVELS[2]
    return LEVELS[3]
  }
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

export function nextCode(existing: string[]): string {
  const nums = existing.map((c) => parseInt(c, 10)).filter((n) => !Number.isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return String(max + 1).padStart(2, "0")
}
