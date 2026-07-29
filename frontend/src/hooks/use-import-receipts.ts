import { useQuery } from "@tanstack/react-query"
import { getImportReceipts } from "@/services/import-service"

export function useImportReceipts(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["import-receipts", page, size, sort, status],
    queryFn: () => getImportReceipts(page, size, sort, status),
    placeholderData: (prev) => prev,
  })
}
