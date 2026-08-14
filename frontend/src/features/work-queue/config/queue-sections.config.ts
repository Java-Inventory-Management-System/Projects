import type { URole } from "@/utils/types"
import {
  ADJUSTMENT_STATUS,
  EXPORT_RECEIPT_STATUS,
  IMPORT_RECEIPT_STATUS,
  RETURN_RECEIPT_STATUS,
  STOCK_CHECK_STATUS,
} from "@/utils/types"
import { getImportReceipts } from "@/services/import-service"
import { getExportReceipts } from "@/services/export-service"
import { getReturnReceipts } from "@/services/return-service"
import { getMyStockChecks, getStockChecks } from "@/services/stock-check-service"
import { getStockAdjustments } from "@/services/stock-adjustment-service"
import { getPriceAdjustments } from "@/services/price-adjustment-service"
import { getQcUnits } from "@/services/qc-processing-service"
import { getLowStock } from "@/services/report-service"

export type QueueKind = "action" | "watch"
export type QueueUrgency = "high" | "normal"

export interface QueueItemStatus {
  key: string
  variant: "default" | "secondary" | "destructive" | "outline"
}

export interface QueueItem {
  id: number
  code: string
  counterparty: string
  time?: string
  status?: QueueItemStatus
  link: string
}

export interface QueueSectionResult {
  count: number
  items: QueueItem[]
}

export interface QueueSectionDef {
  key: string
  titleKey: string
  roles: URole[]
  urgency: QueueUrgency
  kind: QueueKind
  viewAllLink: string
  load: (userId?: number | null) => Promise<QueueSectionResult>
}

const item = (id: number, code: string, counterparty: string, link: string, time?: string, status?: QueueItemStatus): QueueItem => ({
  id,
  code,
  counterparty,
  link,
  time,
  status,
})

export const QUEUE_SECTIONS: QueueSectionDef[] = [
  {
    key: "import-rejected",
    titleKey: "workQueue.sections.importRejected",
    roles: ["STOCK"],
    urgency: "high",
    kind: "action",
    viewAllLink: "/stock/imports?status=REJECTED",
    load: async () => {
      const r = await getImportReceipts(0, 3, "createdAt,desc", IMPORT_RECEIPT_STATUS.REJECTED, true)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.receiptCode, x.supplierName, `/stock/imports/${x.id}`, x.createdAt, { key: "rejected", variant: "destructive" })),
      }
    },
  },
  {
    key: "export-pending",
    titleKey: "workQueue.sections.exportPending",
    roles: ["STOCK"],
    urgency: "high",
    kind: "action",
    viewAllLink: "/stock/exports?status=PENDING",
    load: async () => {
      const r = await getExportReceipts(0, 3, "createdAt,desc", EXPORT_RECEIPT_STATUS.PENDING)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.receiptCode, x.customerName ?? x.createdByName ?? "—", `/stock/exports/${x.id}`, x.createdAt, { key: "pendingApproval", variant: "secondary" })),
      }
    },
  },
  {
    key: "qc-pending",
    titleKey: "workQueue.sections.qcPending",
    roles: ["STOCK"],
    urgency: "normal",
    kind: "action",
    viewAllLink: "/returns-qc/qc",
    load: async () => {
      const units = await getQcUnits([])
      return {
        count: units.length,
        items: units.map((u) => item(u.id, u.serialNumber ?? u.exportReceiptCode ?? "—", u.productName, "/returns-qc/qc", undefined, { key: "pendingQc", variant: "secondary" })),
      }
    },
  },
  {
    key: "import-draft",
    titleKey: "workQueue.sections.importDraft",
    roles: ["STOCK"],
    urgency: "normal",
    kind: "action",
    viewAllLink: "/stock/imports?status=DRAFT",
    load: async () => {
      const r = await getImportReceipts(0, 3, "createdAt,desc", IMPORT_RECEIPT_STATUS.DRAFT)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.receiptCode, x.supplierName, `/stock/imports/${x.id}`, x.createdAt, { key: "draft", variant: "secondary" })),
      }
    },
  },
  {
    key: "stock-check",
    titleKey: "workQueue.sections.stockCheck",
    roles: ["STOCK"],
    urgency: "normal",
    kind: "action",
    viewAllLink: "/stock/ops/checks?status=PENDING",
    load: async (userId) => {
      const [pending, inProgress] = await Promise.all([
        getMyStockChecks(0, 3, "createdAt,desc", STOCK_CHECK_STATUS.PENDING),
        getMyStockChecks(0, 3, "createdAt,desc", STOCK_CHECK_STATUS.IN_PROGRESS),
      ])
      const merged = [...pending.content, ...inProgress.content].slice(0, 3)
      return {
        count: pending.pagination.totalElements + inProgress.pagination.totalElements,
        items: merged.map((x) => item(x.id, x.checkCode, x.scopeName ?? x.createdByName ?? "—", `/stock/ops/checks/${x.id}`, x.createdAt, { key: "inProgress", variant: "secondary" })),
      }
    },
  },
  {
    key: "low-stock",
    titleKey: "workQueue.sections.lowStock",
    roles: ["STOCK"],
    urgency: "normal",
    kind: "watch",
    viewAllLink: "/products",
    load: async () => {
      const r = await getLowStock(0, 3)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.productId, x.productSku ?? "—", x.productName, "/products")),
      }
    },
  },
  {
    key: "export-mine",
    titleKey: "workQueue.sections.exportMine",
    roles: ["SALES"],
    urgency: "normal",
    kind: "watch",
    viewAllLink: "/stock/exports?status=PENDING",
    load: async (userId) => {
      const r = await getExportReceipts(0, 3, "createdAt,desc", EXPORT_RECEIPT_STATUS.PENDING, undefined, userId)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.receiptCode, x.customerName ?? "—", `/stock/exports/${x.id}`, x.createdAt, { key: "pendingApproval", variant: "secondary" })),
      }
    },
  },
  {
    key: "return-mine",
    titleKey: "workQueue.sections.returnMine",
    roles: ["SALES"],
    urgency: "normal",
    kind: "watch",
    viewAllLink: "/returns-qc/returns?status=PENDING_APPROVAL",
    load: async (userId) => {
      const r = await getReturnReceipts(0, 3, RETURN_RECEIPT_STATUS.PENDING_APPROVAL, undefined, undefined, userId)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.receiptCode, x.customerName ?? x.createdByName ?? "—", `/returns-qc/returns/${x.id}`, x.createdAt, { key: "pendingApproval", variant: "secondary" })),
      }
    },
  },
  {
    key: "return-approval",
    titleKey: "workQueue.sections.returnApproval",
    roles: ["MANAGER", "ADMIN"],
    urgency: "high",
    kind: "action",
    viewAllLink: "/returns-qc/returns?status=PENDING_APPROVAL",
    load: async () => {
      const r = await getReturnReceipts(0, 3, RETURN_RECEIPT_STATUS.PENDING_APPROVAL)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.receiptCode, x.customerName ?? x.createdByName ?? "—", `/returns-qc/returns/${x.id}`, x.createdAt, { key: "pendingApproval", variant: "secondary" })),
      }
    },
  },
  {
    key: "adjustment-approval",
    titleKey: "workQueue.sections.adjustmentApproval",
    roles: ["MANAGER", "ADMIN"],
    urgency: "high",
    kind: "action",
    viewAllLink: "/stock/ops/adjustments?status=PENDING",
    load: async () => {
      const r = await getStockAdjustments(0, 3, "createdAt,desc", undefined, ADJUSTMENT_STATUS.PENDING)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.adjustCode, x.productName ?? x.serialNumber ?? "—", `/stock/ops/adjustments/${x.id}`, x.createdAt, { key: "pendingApproval", variant: "secondary" })),
      }
    },
  },
  {
    key: "price-approval",
    titleKey: "workQueue.sections.priceApproval",
    roles: ["MANAGER", "ADMIN"],
    urgency: "normal",
    kind: "action",
    viewAllLink: "/stock/ops/price-adjustments?status=PENDING",
    load: async () => {
      const r = await getPriceAdjustments(0, 3, "createdAt,desc", ADJUSTMENT_STATUS.PENDING)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.adjustCode, x.productName ?? "—", `/stock/ops/price-adjustments/${x.id}`, x.createdAt, { key: "pendingApproval", variant: "secondary" })),
      }
    },
  },
  {
    key: "check-approval",
    titleKey: "workQueue.sections.checkApproval",
    roles: ["MANAGER", "ADMIN"],
    urgency: "normal",
    kind: "action",
    viewAllLink: "/stock/ops/checks?status=COMPLETED",
    load: async () => {
      const r = await getStockChecks(0, 3, "createdAt,desc", STOCK_CHECK_STATUS.COMPLETED)
      return {
        count: r.pagination.totalElements,
        items: r.content.map((x) => item(x.id, x.checkCode, x.scopeName ?? x.createdByName ?? "—", `/stock/ops/checks/${x.id}`, x.createdAt, { key: "completed", variant: "secondary" })),
      }
    },
  },
]
