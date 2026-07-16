import type { LocationResponse } from "@/utils/types"

const defaultZoneMap: Record<number, string> = {
  1: "A", 2: "D", 3: "B", 4: "E",
  5: "F", 6: "C", 7: "G", 8: "H",
}

export function suggestLocation(
  categoryId: number | null,
  locs: LocationResponse[],
  zoneMap: Record<number, string> = defaultZoneMap,
  fallbackCode = "I-01-01",
): LocationResponse | null {
  if (!categoryId) return locs.find((l) => l.fullCode === fallbackCode) ?? null
  const zone = zoneMap[categoryId]
  if (!zone) return locs.find((l) => l.fullCode === fallbackCode) ?? null
  return locs.find((l) => l.zoneCode === zone && l.isActive) ?? null
}
