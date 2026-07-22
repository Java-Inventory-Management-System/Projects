import http from "@/utils/http-client"
import type { AuditLog, ResponsePage } from "@/utils/types"
import { mapResponsePage } from "@/utils/mappers"

function mapAuditLog(raw: unknown): AuditLog {
  const r = raw as {
    id: number
    userId?: number | null
    username?: string | null
    ipAddress?: string | null
    requestId?: string | null
    action: string
    entityName: string
    entityId?: string | null
    oldValue?: string | null
    newValue?: string | null
    status: string
    errorMsg?: string | null
    createdAt: string
  }
  return {
    userId: r.userId ?? null,
    username: r.username ?? null,
    ipAddress: r.ipAddress ?? null,
    requestId: r.requestId ?? null,
    action: r.action,
    entityName: r.entityName,
    entityId: r.entityId ?? null,
    oldValue: r.oldValue ?? null,
    newValue: r.newValue ?? null,
    status: r.status,
    errorMsg: r.errorMsg ?? null,
    createdAt: r.createdAt,
  }
}

export interface AuditSearchParams {
  action?: string
  entity?: string
  userId?: number
  status?: string
  from?: string
  to?: string
  sort?: string
  page?: number
  size?: number
}

export async function searchAuditLogs(params: AuditSearchParams = {}): Promise<ResponsePage<AuditLog>> {
  const res = await http.get("/audit-logs", { params })
  return mapResponsePage(res, mapAuditLog)
}
