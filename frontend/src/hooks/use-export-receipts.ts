import { useQuery } from "@tanstack/react-query"
import { getExportReceipts } from "@/services/export-service"

export function useExportReceipts(page = 0, size = 20) {
  return useQuery({
    queryKey: ["export-receipts", page, size],
    queryFn: () => getExportReceipts(page, size),
  })
}
