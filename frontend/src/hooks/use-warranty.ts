import { useQuery } from "@tanstack/react-query"
import { getWarrantyRequests, getMyHandledWarrantyRequests } from "@/services/warranty-service"

export function useWarrantyRequests(page = 0, size = 20, status?: string, resolutionType?: string) {
  return useQuery({
    queryKey: ["warranty-requests", page, size, status, resolutionType],
    queryFn: () => getWarrantyRequests(page, size, status, resolutionType),
  })
}

export function useMyHandledWarrantyRequests(page = 0, size = 20) {
  return useQuery({
    queryKey: ["my-handled-warranty-requests", page, size],
    queryFn: () => getMyHandledWarrantyRequests(page, size),
  })
}
