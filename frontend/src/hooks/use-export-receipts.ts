import { useQuery } from "@tanstack/react-query"
import { getExportReceipts } from "@/services/export-service"

export function useExportReceipts(page = 0, size = 20, sort?: string) {
  return useQuery({
    queryKey: ["export-receipts", page, size, sort],
    queryFn: () => getExportReceipts(page, size, sort),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}
