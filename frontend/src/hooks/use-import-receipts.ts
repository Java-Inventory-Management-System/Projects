import { useQuery } from "@tanstack/react-query"
import { getImportReceipts } from "@/services/import-service"

export function useImportReceipts(page = 0, size = 20, sort?: string) {
  return useQuery({
    queryKey: ["import-receipts", page, size, sort],
    queryFn: () => getImportReceipts(page, size, sort),
    placeholderData: (prev) => prev,
  })
}
