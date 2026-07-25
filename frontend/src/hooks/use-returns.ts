import { useQuery } from "@tanstack/react-query"
import { getReturnReceipts } from "@/services/return-service"

export function useReturnReceipts(page = 0, size = 20) {
  return useQuery({
    queryKey: ["return-receipts", page, size],
    queryFn: () => getReturnReceipts(page, size),
    placeholderData: (prev) => prev,
  })
}
