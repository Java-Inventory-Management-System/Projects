import { useTranslation } from "react-i18next"
import type { ImportReceipt } from "@/utils/types"
import { IMPORT_RECEIPT_STATUS } from "@/utils/types"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScanLine, Eye } from "lucide-react"

const getStatusLabel = (status: string, t: (k: string) => string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
  const keyMap: Record<string, string> = {
    [IMPORT_RECEIPT_STATUS.DRAFT]: "draft", [IMPORT_RECEIPT_STATUS.PENDING_APPROVAL]: "pendingApproval", [IMPORT_RECEIPT_STATUS.COMPLETED]: "completed", [IMPORT_RECEIPT_STATUS.CANCELLED]: "cancelled",
  }
  const variantMap: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
    [IMPORT_RECEIPT_STATUS.DRAFT]: "secondary", [IMPORT_RECEIPT_STATUS.PENDING_APPROVAL]: "outline", [IMPORT_RECEIPT_STATUS.COMPLETED]: "default", [IMPORT_RECEIPT_STATUS.CANCELLED]: "destructive",
  }
  return { label: t(`importStatus.${keyMap[status] ?? status}`, status), variant: variantMap[status] ?? "secondary" }
}

export const ViewImportModal = ({
  receipt,
  open,
  onOpenChange,
}: {
  receipt: ImportReceipt | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  if (!receipt)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("viewImportModal.noData")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("viewImportModal.notFound")}</p>
        </DialogContent>
      </Dialog>
    )
  const s = getStatusLabel(receipt.status, t)
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
            <div>
              <span className="text-muted-foreground">{t("label.supplier")}</span>
              <p className="font-medium">{receipt.supplierName || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.createdDate")}</span>
              <p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.creator")}</span>
              <p className="font-medium">{receipt.createdByName || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.approver")}</span>
              <p className="font-medium">{receipt.approvedByName ?? "—"}</p>
            </div>
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
                  <TableHead className="w-14 text-center">{t("table.warranty")}</TableHead>
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
                    <TableCell className="text-right tabular-nums">
                      {(item.unitPrice ?? 0).toLocaleString("vi-VN")}₫
                    </TableCell>
                    <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                      {item.warrantyMonths ? t("importDetail.warrantyAbbr", { count: item.warrantyMonths }) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString("vi-VN")}₫
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              {t("viewImportModal.totalUnits", { count: receipt.items.reduce((sum, i) => sum + i.createdUnits, 0) })}
            </span>
            <span className="text-lg font-semibold">{t("viewImportModal.total")}: {(receipt.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); navigate(`/stock/imports/${receipt.id}`) }}>
            <Eye className="size-4 mr-1" /> {t("viewImportModal.viewDetail")}
          </Button>
          {receipt.status === IMPORT_RECEIPT_STATUS.DRAFT && (
            <Button onClick={() => { onOpenChange(false); navigate(`/stock/imports/new?id=${receipt.id}`) }}>
              <ScanLine className="size-4 mr-1" /> {t("viewImportModal.enterSerials")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
