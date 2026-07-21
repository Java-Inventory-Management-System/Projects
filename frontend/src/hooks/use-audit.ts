import { useQuery } from "@tanstack/react-query"
import { searchAuditLogs } from "@/services/audit-service"
import type { AuditSearchParams } from "@/services/audit-service"

export function useAuditLogs(params: AuditSearchParams = {}) {
  const { action, entity, userId, status, from, to, page = 0, size = 20 } = params
  return useQuery({
    queryKey: ["audit-logs", { action, entity, userId, status, from, to, page, size }],
    queryFn: () => searchAuditLogs(params),
  })
}
