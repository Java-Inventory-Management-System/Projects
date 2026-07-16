import { useQuery } from "@tanstack/react-query"
import { getInventory } from "@/services/inventory-service"

export function useInventory(page = 0, size = 20, search?: string) {
  return useQuery({
    queryKey: ["inventory", page, size, search],
    queryFn: () => getInventory(page, size, search),
  })
}
