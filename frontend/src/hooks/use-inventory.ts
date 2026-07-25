import { useQuery } from "@tanstack/react-query"
import { getInventory } from "@/services/inventory-service"

export function useInventory(page = 0, size = 20, search?: string) {
  return useQuery({
    queryKey: ["inventory", page, size, search],
    queryFn: () => getInventory(page, size, search),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}
