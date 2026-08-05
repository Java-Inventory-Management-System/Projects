import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { EXPORT_RECEIPT_STATUS, type ExportReceipt } from "@/utils/types"
import { usePermission } from "@/hooks/use-permission"
import { formatDateTime, formatMoney } from "@/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Eye, ArrowRightFromLine } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const getStatusLabel = (status: string, t: (k: string) => string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
  const map: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
    PENDING: "outline", APPROVED: "secondary", COMPLETED: "default", CANCELLED: "destructive",
  }
  const key = `exportStatus.${status.toLowerCase()}`
  return { label: t(key, status), variant: map[status] ?? "secondary" }
}

export const ViewExportModal = ({
  receipt,
  open,
  onOpenChange,
}: {
  receipt: ExportReceipt | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermission()
  if (!receipt) return null
  const s = getStatusLabel(receipt.status, t)
  const canFulfill =
    (receipt.status === EXPORT_RECEIPT_STATUS.PENDING || receipt.status === EXPORT_RECEIPT_STATUS.APPROVED) &&
    perm.hasRole("STOCK", "MANAGER", "ADMIN")
  const reasonLabel: Record<string, string> = {
    SALE: t("exportReason.sale"),
    INTERNAL: t("exportReason.internal"),
    RETURN_SUPPLIER: t("exportReason.returnSupplier"),
    DISPOSE: t("exportReason.dispose"),
    WARRANTY_REPLACEMENT: t("exportReason.warrantyReplacement"),
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,80rem)]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{receipt.receiptCode}</DialogTitle>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">{t("table.reason")}:</span><p className="font-medium">{reasonLabel[receipt.reason] ?? receipt.reason}</p></div>
            <div><span className="text-muted-foreground">{t("table.customer")}:</span><p className="font-medium">{receipt.customerName ?? "—"}</p></div>
            <div><span className="text-muted-foreground">{t("label.createdDate")}</span><p className="font-medium">{formatDateTime(receipt.createdAt)}</p></div>
            <div><span className="text-muted-foreground">{t("label.creator")}</span><p className="font-medium">{receipt.createdByName}</p></div>
            {receipt.approvedByName && <div><span className="text-muted-foreground">{t("label.approver")}</span><p className="font-medium">{receipt.approvedByName}</p></div>}
            {receipt.fulfilledByName && <div><span className="text-muted-foreground">{t("label.exporter")}</span><p className="font-medium">{receipt.fulfilledByName}</p></div>}
          </div>
          {receipt.note && (
            <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">{t("label.note")}</span>
              <p className="mt-1 leading-relaxed">{receipt.note}</p>
            </div>
          )}
          <div className="rounded-lg border overflow-x-auto max-h-[60vh] overflow-y-auto">
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
                    <TableCell className="text-right tabular-nums">{formatMoney(item.unitPrice ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney((item.quantity ?? 0) * (item.unitPrice ?? 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <span className="text-lg font-semibold">{t("viewExportModal.total")}: {formatMoney(receipt.totalAmount ?? 0)}</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); navigate(`/stock/exports/${receipt.id}`) }}>
            <Eye className="size-4 mr-1" /> {t("viewExportModal.viewDetail")}
          </Button>
          {canFulfill && (
            <Button onClick={() => { onOpenChange(false); navigate(`/stock/exports/${receipt.id}/fulfill`) }}>
              <ArrowRightFromLine className="size-4 mr-1" /> {t("viewExportModal.export")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}