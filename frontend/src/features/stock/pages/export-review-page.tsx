import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getExportReceiptById, approveExportReceipt, rejectExportReceipt } from "@/services/export-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Textarea } from "@/components/ui/textarea"
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
import { EXPORT_RECEIPT_STATUS } from "@/utils/types"

export function ExportReviewPage() {
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
  }
  const qc = useQueryClient()
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["export-receipt", id],
    queryFn: () => getExportReceiptById(Number(id)),
    enabled: !!id,
  })

  const action = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      if (action === "approve") return approveExportReceipt(Number(id))
      return rejectExportReceipt(Number(id), { rejectReason })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["export-receipt", id] })
      qc.invalidateQueries({ queryKey: ["export-receipts"] })
      toast.success(t("exportReview.actionSuccess"))
      setConfirmAction(null)
      setRejectReason("")
    },
    onError: (e: Error) => { toast.error(e.message || t("exportReview.actionError")); setConfirmAction(null) },
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!receipt) return <Empty><EmptyTitle>{t("exportReview.notFound")}</EmptyTitle></Empty>

  const s = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" as const }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/stock/exports")}>{t("nav.exports")}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{t("exportReview.breadcrumb", { code: receipt.receiptCode })}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{receipt.receiptCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">{t("label.reason")}</span><p className="font-medium">{reasonLabel[receipt.reason] ?? receipt.reason}</p></div>
            <div><span className="text-muted-foreground">{t("label.createdDate")}</span><p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p></div>
            {receipt.customerName && <div><span className="text-muted-foreground">{t("label.customer")}</span><p className="font-medium">{receipt.customerName}</p></div>}
            <div><span className="text-muted-foreground">{t("label.creator")}</span><p className="font-medium">{receipt.createdByName || "—"}</p></div>
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

      <div className="flex justify-end"><span className="text-lg font-semibold">{t("exportReview.total")}: {(receipt.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span></div>

      {receipt.status === EXPORT_RECEIPT_STATUS.PENDING && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("reject")}>
            {t("exportReview.reject")}
          </Button>
          <Button onClick={() => setConfirmAction("approve")}>
            {t("exportReview.approve")}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmAction === "approve"} onOpenChange={(v) => { if (!v) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("exportReview.approveConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("exportReview.approveConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => action.mutate("approve")} disabled={action.isPending}>
              {action.isPending ? t("dialog.processing") : t("exportReview.approveConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === "reject"} onOpenChange={(v) => { if (!v) { setConfirmAction(null); setRejectReason("") } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("exportReview.rejectConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("exportReview.rejectConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder={t("exportReview.rejectReasonPlaceholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason("")}>{t("dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => action.mutate("reject")} disabled={action.isPending || !rejectReason.trim()}>
              {action.isPending ? t("dialog.processing") : t("exportReview.rejectConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}