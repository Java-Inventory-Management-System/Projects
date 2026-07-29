import type { ImportReceipt } from "@/utils/types"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScanLine, Eye } from "lucide-react"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Bản nháp", variant: "secondary" },
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "outline" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
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
  const navigate = useNavigate()
  if (!receipt)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Không có dữ liệu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Không tìm thấy thông tin phiếu nhập.</p>
        </DialogContent>
      </Dialog>
    )
  const s = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" }
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
              <span className="text-muted-foreground">Nhà cung cấp:</span>
              <p className="font-medium">{receipt.supplierName || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ngày tạo:</span>
              <p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Người tạo:</span>
              <p className="font-medium">{receipt.createdByName || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Người duyệt:</span>
              <p className="font-medium">{receipt.approvedByName ?? "—"}</p>
            </div>
          </div>
          {receipt.note && (
            <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">GHI CHÚ</span>
              <p className="mt-1 leading-relaxed">{receipt.note}</p>
            </div>
          )}
          <div className="rounded-lg border overflow-x-auto max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="w-16 text-right">SL</TableHead>
                  <TableHead className="w-24 text-right">Đơn giá</TableHead>
                  <TableHead className="w-14 text-center">BH</TableHead>
                  <TableHead className="w-24 text-right">Thành tiền</TableHead>
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
                      {item.warrantyMonths ? `${item.warrantyMonths}t` : "—"}
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
              Tổng số đơn vị sản phẩm đã tạo: {receipt.items.reduce((sum, i) => sum + i.createdUnits, 0)}
            </span>
            <span className="text-lg font-semibold">Tổng: {(receipt.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => navigate(`/stock/imports/${receipt.id}`)}>
            <Eye className="size-4 mr-1" /> Xem chi tiết
          </Button>
          {(receipt.status === "DRAFT" || receipt.status === "PENDING_APPROVAL") && (
            <Button onClick={() => navigate(`/stock/imports/new?id=${receipt.id}`)}>
              <ScanLine className="size-4 mr-1" /> Nhập serial
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
