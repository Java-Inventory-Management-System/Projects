import { useQuery } from "@tanstack/react-query"
import { getCategories } from "@/services/category-service"

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000,
  })
}
