import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getExportReceiptById, approveExportReceipt, cancelExportReceipt } from "@/services/export-service"
import { usePermission } from "@/hooks/use-permission"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Check, X } from "lucide-react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/utils/toast"
import { downloadCsv } from "@/utils/download-csv"
import { PrintReceiptButton } from "../components/print-receipt"
import { FileDown } from "lucide-react"
import { EXPORT_RECEIPT_STATUS } from "@/utils/types"

export function ExportDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING: { label: t("exportStatus.pending"), variant: "outline" },
    APPROVED: { label: t("exportStatus.approved"), variant: "secondary" },
    COMPLETED: { label: t("exportStatus.completed"), variant: "default" },
    CANCELLED: { label: t("exportStatus.cancelled"), variant: "destructive" },
  }
  const reasonLabel: Record<string, string> = {
    SALE: t("exportReason.sale"),
    INTERNAL: t("exportReason.internal"),
    RETURN_SUPPLIER: t("exportReason.returnSupplier"),
    DISPOSE: t("exportReason.dispose"),
    WARRANTY_REPLACEMENT: t("exportReason.warrantyReplacement"),
  }
  const qc = useQueryClient()
  const perm = usePermission()
  const [confirmAction, setConfirmAction] = useState<"approve" | "cancel" | null>(null)

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["export-receipt", id],
    queryFn: () => getExportReceiptById(Number(id)),
    enabled: !!id,
  })

  const action = useMutation({
    mutationFn: async (action: "approve" | "cancel") => {
      if (action === "approve") return approveExportReceipt(Number(id))
      return cancelExportReceipt(Number(id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["export-receipt", id] })
      qc.invalidateQueries({ queryKey: ["export-receipts"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["inventory-summary"] })
      qc.invalidateQueries({ queryKey: ["low-stock"] })
      toast.success(t("exportDetail.actionSuccess"))
      setConfirmAction(null)
    },
    onError: (e: Error) => { toast.error(e.message); setConfirmAction(null) },
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!receipt) return <Empty><EmptyTitle>{t("exportDetail.notFound")}</EmptyTitle></Empty>

  const s = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" as const }

  const handleDownloadInvoice = () => {
    downloadCsv(
      `${receipt.receiptCode}.csv`,
      [t("table.product"), t("table.sku"), t("table.quantity"), t("table.unitPrice"), t("table.total")],
      receipt.items.map((item) => [
        item.productName, item.productSku ?? "", String(item.quantity),
        (item.unitPrice ?? 0).toLocaleString("vi-VN"),
        ((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString("vi-VN"),
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/stock/exports")}>{t("nav.exports")}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{receipt.receiptCode}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{receipt.receiptCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {receipt.status === EXPORT_RECEIPT_STATUS.PENDING && (/* perm.hasRole("MANAGER", "ADMIN") && */
            <>
              <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("cancel")}>
                <X className="size-4 mr-1" /> {t("exportDetail.cancelReceipt")}
              </Button>
              <Button onClick={() => setConfirmAction("approve")}>
                <Check className="size-4 mr-1" /> {t("exportDetail.approve")}
              </Button>
            </>
          )}
          {receipt.status === EXPORT_RECEIPT_STATUS.APPROVED && (/* perm.hasRole("STOCK", "MANAGER", "ADMIN") && */
            <Button onClick={() => navigate(`/stock/exports/${receipt.id}/fulfill`)}>
              {t("exportDetail.fulfill")}
            </Button>
          )}
          {perm.hasRole("MANAGER", "ADMIN") && receipt.status !== EXPORT_RECEIPT_STATUS.CANCELLED && receipt.status !== EXPORT_RECEIPT_STATUS.PENDING && receipt.status !== EXPORT_RECEIPT_STATUS.COMPLETED && (
            <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("cancel")}>
              <X className="size-4 mr-1" /> {t("exportDetail.cancelReceipt")}
            </Button>
          )}
          <PrintReceiptButton
            receipt={{
              code: receipt.receiptCode, type: "export", status: receipt.status,
              createdAt: receipt.createdAt, createdByName: receipt.createdByName ?? "",
              approvedByName: receipt.approvedByName, note: receipt.note,
              totalAmount: receipt.totalAmount,
              items: receipt.items.map((item) => ({ ...item, productSku: item.productSku ?? "" })),
            }}
            type="export"
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadInvoice}>
            <FileDown className="size-4" /> CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">{t("label.reason")}</span><p className="font-medium">{reasonLabel[receipt.reason] ?? receipt.reason}</p></div>
            <div><span className="text-muted-foreground">{t("label.createdDate")}</span><p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p></div>
            {receipt.customerName && <div><span className="text-muted-foreground">{t("label.customer")}</span><p className="font-medium">{receipt.customerName}</p></div>}
            {receipt.externalReference && <div><span className="text-muted-foreground">{t("label.warrantyCode")}</span><p className="font-medium font-mono text-xs">{receipt.externalReference}</p></div>}
            <div><span className="text-muted-foreground">{t("label.creator")}</span><p className="font-medium">{receipt.createdByName || "—"}</p></div>
            <div><span className="text-muted-foreground">{t("label.approver")}</span><p className="font-medium">{receipt.approvedByName ?? "—"}</p></div>
            {receipt.fulfilledByName && <div><span className="text-muted-foreground">{t("label.exporter")}</span><p className="font-medium">{receipt.fulfilledByName}</p></div>}
            {receipt.fulfilledAt && <div><span className="text-muted-foreground">{t("label.exportDate")}</span><p className="font-medium">{new Date(receipt.fulfilledAt).toLocaleString("vi-VN")}</p></div>}
            {receipt.rejectedByName && <div><span className="text-muted-foreground">{t("label.rejector")}</span><p className="font-medium">{receipt.rejectedByName}</p></div>}
            {receipt.rejectReason && <div><span className="text-muted-foreground">{t("label.rejectReason")}</span><p className="font-medium">{receipt.rejectReason}</p></div>}
          </div>
        </CardContent>
      </Card>

      {receipt.note && (
        <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
          <span className="text-xs font-medium text-muted-foreground tracking-wide">{t("label.note")}</span>
          <p className="mt-1">{receipt.note}</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead className="w-16 text-right">{t("table.qty")}</TableHead>
                <TableHead className="w-24 text-right">{t("table.unitPrice")}</TableHead>
                <TableHead className="w-24 text-right">{t("table.total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.productSku}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{(item.unitPrice ?? 0).toLocaleString("vi-VN")}₫</TableCell>
                  <TableCell className="text-right tabular-nums">{((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString("vi-VN")}₫</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end"><span className="text-lg font-semibold">{t("exportDetail.total")}: {(receipt.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span></div>

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction === "approve" ? t("exportDetail.approveConfirmTitle") : t("exportDetail.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? t("exportDetail.approveConfirmDescription")
                : t("exportDetail.cancelConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAction && action.mutate(confirmAction)} disabled={action.isPending}>
              {action.isPending ? t("dialog.processing") : t("dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}