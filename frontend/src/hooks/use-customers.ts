import { useQuery } from "@tanstack/react-query"
import { getCustomers } from "@/services/customer-service"

export function useCustomers(page = 0, size = 20, search?: string) {
  return useQuery({
    queryKey: ["customers", page, size, search],
    queryFn: () => getCustomers(page, size, search),
  })
}
