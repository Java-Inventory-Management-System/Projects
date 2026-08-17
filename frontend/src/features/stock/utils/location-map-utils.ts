import type { LocationMapBinProduct } from "@/utils/types"

export type FilterMode = "all" | "empty" | "stocked" | "full"
export type FillLevel = "empty" | "low" | "medium" | "full"

export interface DetailBin {
  id: number
  zoneCode: string
  fullCode: string
  binCode: string
  productCount: number
  maxCapacity: number | null
  productSkuList?: string[]
  boxCount?: number
  boxCodes?: string[]
  products?: LocationMapBinProduct[]
}

export interface LevelStyle {
  key: FillLevel
  bg: string
  border: string
  text: string
}

export const LEVELS: LevelStyle[] = [
  {
    key: "empty",
    bg: "bg-background dark:bg-background",
    border: "border border-dashed border-border dark:border-border",
    text: "text-muted-foreground dark:text-muted-foreground",
  },
  {
    key: "low",
    bg: "bg-blue-200 dark:bg-blue-900",
    border: "border border-blue-400 dark:border-blue-700",
    text: "text-blue-900 dark:text-blue-100",
  },
  {
    key: "medium",
    bg: "bg-amber-200 dark:bg-amber-900",
    border: "border-2 border-amber-400 dark:border-amber-700",
    text: "text-amber-900 dark:text-amber-100 font-medium",
  },
  {
    key: "full",
    bg: "bg-red-500 dark:bg-red-500",
    border: "border-[3px] border-red-600 dark:border-red-600",
    text: "text-white dark:text-white font-bold",
  },
] as const

/** Ngưỡng % capacity (dùng chung cho filter + màu): <50% xanh, 50-89% vàng, ≥90% đỏ */
export const CAPACITY_THRESHOLDS = {
  empty: 0,
  low: 0.5,
  medium: 0.9,
  full: 1.0,
} as const

const COUNT_THRESHOLDS = { empty: 0, low: 10, medium: 50, full: Infinity }

export function fillLevel(count: number, maxCapacity?: number | null): FillLevel {
  if (maxCapacity != null && maxCapacity > 0) {
    const pct = count / maxCapacity
    if (pct === 0) return "empty"
    if (pct < CAPACITY_THRESHOLDS.low) return "low"
    if (pct < CAPACITY_THRESHOLDS.medium) return "medium"
    return "full"
  }
  if (count === 0) return "empty"
  if (count < COUNT_THRESHOLDS.low) return "low"
  if (count < COUNT_THRESHOLDS.medium) return "medium"
  return "full"
}

export function binColor(count: number, maxCapacity?: number | null) {
  return LEVELS.find((l) => l.key === fillLevel(count, maxCapacity)) ?? LEVELS[0]
}

/** Màu thanh capacity theo ngưỡng chung: <50% xanh dương, 50-89% vàng, ≥90% đỏ */
export function capacityBarColor(pct: number) {
  if (pct >= CAPACITY_THRESHOLDS.medium) return "bg-red-500"
  if (pct >= CAPACITY_THRESHOLDS.low) return "bg-amber-500"
  return "bg-blue-500"
}

export const FILTERS: { key: FilterMode }[] = [
  { key: "all" },
  { key: "empty" },
  { key: "stocked" },
  { key: "full" },
]

/** Convert FillLevel → FilterMode for matching */
export function fillLevelToFilter(level: FillLevel): FilterMode {
  if (level === "empty") return "empty"
  if (level === "full") return "full"
  return "stocked"
}

export function nextCode(existing: string[]): string {
  const nums = existing.map((c) => parseInt(c, 10)).filter((n) => !Number.isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return String(max + 1).padStart(2, "0")
}


