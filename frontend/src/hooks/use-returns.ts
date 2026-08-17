import { useQuery } from "@tanstack/react-query"
import { getReturnReceipts } from "@/services/return-service"

export function useReturnReceipts(page = 0, size = 20, status?: string, reason?: string, search?: string) {
  return useQuery({
    queryKey: ["return-receipts", page, size, status, reason, search],
    queryFn: () => getReturnReceipts(page, size, status, reason, search),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}
