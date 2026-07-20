import type { ExportReceipt } from "@/utils/types"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "outline" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

const reasonLabel: Record<string, string> = {
  SALE: "Bán hàng",
  INTERNAL: "Nội bộ",
  RETURN_SUPPLIER: "Trả NCC",
  DISPOSE: "Hủy",
}

export const ViewExportModal = ({ receipt, open, onOpenChange }: { receipt: ExportReceipt | null; open: boolean; onOpenChange: (v: boolean) => void }) => {
  if (!receipt) return null
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
              <span className="text-muted-foreground">Lý do:</span>
              <p className="font-medium">{reasonLabel[receipt.reason] ?? receipt.reason}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Khách hàng:</span>
              <p className="font-medium">{receipt.customerName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ngày tạo:</span>
              <p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Người tạo:</span>
              <p className="font-medium">{receipt.createdByName}</p>
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
                    <TableCell className="text-right tabular-nums">{item.unitPrice.toLocaleString("vi-VN")}₫</TableCell>
                    <TableCell className="text-right tabular-nums">{(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <span className="text-lg font-semibold">Tổng: {receipt.totalAmount.toLocaleString("vi-VN")}₫</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
