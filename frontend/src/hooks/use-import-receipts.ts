import { useQuery } from "@tanstack/react-query"
import { getImportReceipts } from "@/services/import-service"

export function useImportReceipts(page = 0, size = 20, sort?: string, status?: string, unresolved?: boolean) {
  return useQuery({
    queryKey: ["import-receipts", page, size, sort, status, unresolved],
    queryFn: () => getImportReceipts(page, size, sort, status, unresolved),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}
