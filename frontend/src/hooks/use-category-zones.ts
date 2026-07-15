import { useQuery } from "@tanstack/react-query"
import { getCategoryZoneMap } from "@/services/category-zone-service"

export function useCategoryZones() {
  return useQuery({
    queryKey: ["category-zones"],
    queryFn: getCategoryZoneMap,
    staleTime: 5 * 60 * 1000,
  })
}
