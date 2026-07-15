import { useQuery } from "@tanstack/react-query"
import { getSuppliers } from "@/services/supplier-service"

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
    staleTime: 10 * 60 * 1000,
  })
}
