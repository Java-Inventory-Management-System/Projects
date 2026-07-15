import { useQuery } from "@tanstack/react-query"
import { getImportReceipts } from "@/services/import-service"

export function useImportReceipts(page = 0, size = 20) {
  return useQuery({
    queryKey: ["import-receipts", page, size],
    queryFn: () => getImportReceipts(page, size),
  })
}
