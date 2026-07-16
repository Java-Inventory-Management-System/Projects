import { useQuery } from "@tanstack/react-query"
import { getLocations } from "@/services/location-service"

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    staleTime: 10 * 60 * 1000,
  })
}
