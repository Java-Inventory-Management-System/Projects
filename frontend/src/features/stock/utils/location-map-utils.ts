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
    bg: "bg-sky-50 dark:bg-sky-950",
    border: "border-sky-200 dark:border-sky-900",
    text: "text-sky-600 dark:text-sky-500",
  },
  {
    key: "low",
    bg: "bg-sky-100 dark:bg-sky-900",
    border: "border-sky-300 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-300",
  },
  {
    key: "medium",
    bg: "bg-sky-200 dark:bg-sky-800",
    border: "border-sky-400 dark:border-sky-700",
    text: "text-sky-800 dark:text-sky-200",
  },
  {
    key: "full",
    bg: "bg-sky-300 dark:bg-sky-700",
    border: "border-sky-500 dark:border-sky-500 border-2",
    text: "text-sky-900 dark:text-sky-100",
  },
] as const

/** Ngưỡng % capacity (dùng chung cho filter + màu) */
export const CAPACITY_THRESHOLDS = {
  empty: 0,
  low: 0.7,
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


