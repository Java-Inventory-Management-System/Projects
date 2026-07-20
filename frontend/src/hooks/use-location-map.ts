import { useQuery } from "@tanstack/react-query"
import { getLocationMap } from "@/services/location-service"

export function useLocationMap() {
  return useQuery({
    queryKey: ["location-map"],
    queryFn: getLocationMap,
    staleTime: 30_000,
  })
}
