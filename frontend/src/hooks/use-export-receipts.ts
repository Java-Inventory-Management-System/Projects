import { useQuery } from "@tanstack/react-query"
import { getExportReceipts } from "@/services/export-service"

export function useExportReceipts(page = 0, size = 20, sort?: string, status?: string, customerId?: number) {
  return useQuery({
    queryKey: ["export-receipts", page, size, sort, status, customerId],
    queryFn: () => getExportReceipts(page, size, sort, status, customerId),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}
