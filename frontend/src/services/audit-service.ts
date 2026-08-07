import http from "@/utils/http-client"
import type { AuditLog, ResponsePage } from "@/utils/types"
import { mapResponsePage } from "@/utils/mappers"

function mapAuditLog(raw: unknown): AuditLog {
  const r = raw as {
    id: number
    userId?: number | null
    username?: string | null
    roleSnapshot?: string | null
    ipAddress?: string | null
    requestId?: string | null
    action: string
    entityName: string
    entityId?: string | null
    oldValue?: string | null
    newValue?: string | null
    status: string
    errorMsg?: string | null
    message?: string | null
    messageFields?: string | null
    createdAt: string
  }
  return {
    userId: r.userId ?? null,
    username: r.username ?? null,
    roleSnapshot: r.roleSnapshot ?? null,
    ipAddress: r.ipAddress ?? null,
    requestId: r.requestId ?? null,
    action: r.action,
    entityName: r.entityName,
    entityId: r.entityId ?? null,
    oldValue: r.oldValue ?? null,
    newValue: r.newValue ?? null,
    status: r.status,
    errorMsg: r.errorMsg ?? null,
    message: r.message ?? null,
    messageFields: parseMessageFields(r.messageFields),
    createdAt: r.createdAt,
  }
}

function parseMessageFields(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === "string") : []
  } catch {
    return []
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
