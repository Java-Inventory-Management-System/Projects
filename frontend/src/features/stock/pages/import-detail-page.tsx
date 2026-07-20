import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getImportReceiptById, approveImportReceipt, cancelImportReceipt } from "@/services/import-service"
import { usePermission } from "@/hooks/use-permission"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { ButtonGroup } from "@/components/ui/button-group"
import { Check, X } from "lucide-react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/utils/toast"
import { downloadCsv } from "@/utils/download-csv"
import { PrintReceiptButton } from "../components/print-receipt"
import { FileDown } from "lucide-react"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ xử lý", variant: "secondary" },
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "outline" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

export function ImportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()
  const [confirmAction, setConfirmAction] = useState<"approve" | "cancel" | null>(null)

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["import-receipt", id],
    queryFn: () => getImportReceiptById(Number(id)),
    enabled: !!id,
  })

  const action = useMutation({
    mutationFn: async (action: "approve" | "cancel") => {
      if (action === "approve") return approveImportReceipt(Number(id))
      return cancelImportReceipt(Number(id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["import-receipt", id] })
      qc.invalidateQueries({ queryKey: ["import-receipts"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["inventory-summary"] })
      qc.invalidateQueries({ queryKey: ["low-stock"] })
      toast.success("Thao tác thành công")
      setConfirmAction(null)
    },
    onError: (e: Error) => { toast.error(e.message); setConfirmAction(null) },
  })

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>
  if (!receipt) return <Empty><EmptyTitle>Không tìm thấy phiếu nhập</EmptyTitle></Empty>

  const s = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" }

  const handleDownloadCsv = () => {
    downloadCsv(
      `${receipt.receiptCode}.csv`,
      ["Sản phẩm", "SKU", "Số lượng", "Đơn giá", "Bảo hành", "Thành tiền"],
      receipt.items.map((item) => [
        item.productName,
        item.productSku,
        String(item.quantity),
        item.unitPrice.toLocaleString("vi-VN"),
        item.warrantyMonths ? `${item.warrantyMonths} tháng` : "—",
        (item.quantity * item.unitPrice).toLocaleString("vi-VN"),
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/stock/imports")}>Nhập kho</BreadcrumbLink></BreadcrumbItem>
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
          {receipt.status === "PENDING_APPROVAL" && (
            <ButtonGroup>
              {perm.canCancel() && (
                <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("cancel")}>
                  <X className="size-4 mr-1" /> Hủy phiếu
                </Button>
              )}
              {perm.canApprove(receipt.status) && (
                <Button onClick={() => setConfirmAction("approve")}>
                  <Check className="size-4 mr-1" /> Duyệt
                </Button>
              )}
            </ButtonGroup>
          )}
          {perm.canCancel() && receipt.status === "COMPLETED" && (
            <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("cancel")}>
              <X className="size-4 mr-1" /> Hủy phiếu
            </Button>
          )}
          <PrintReceiptButton
            receipt={{
              code: receipt.receiptCode,
              type: "import",
              status: receipt.status,
              createdAt: receipt.createdAt,
              createdByName: receipt.createdByName,
              approvedByName: receipt.approvedByName,
              note: receipt.note,
              totalAmount: receipt.totalAmount,
              items: receipt.items,
            }}
            type="import"
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadCsv}>
            <FileDown className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Nhà cung cấp:</span><p className="font-medium">{receipt.supplierName || "—"}</p></div>
            <div><span className="text-muted-foreground">Ngày tạo:</span><p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p></div>
            <div><span className="text-muted-foreground">Người tạo:</span><p className="font-medium">{receipt.createdByName || "—"}</p></div>
            <div><span className="text-muted-foreground">Người duyệt:</span><p className="font-medium">{receipt.approvedByName ?? "—"}</p></div>
          </div>
        </CardContent>
      </Card>

      {receipt.note && (
        <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
          <span className="text-xs font-medium text-muted-foreground tracking-wide">GHI CHÚ</span>
          <p className="mt-1">{receipt.note}</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
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
                  <TableCell className="text-right tabular-nums">{item.unitPrice.toLocaleString("vi-VN")}₫</TableCell>
                  <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{item.warrantyMonths ? `${item.warrantyMonths}t` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <span className="text-lg font-semibold">Tổng: {receipt.totalAmount.toLocaleString("vi-VN")}₫</span>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction === "approve" ? "Duyệt phiếu nhập" : "Hủy phiếu nhập"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? "Xác nhận duyệt phiếu nhập này? Hàng sẽ được nhập kho."
                : "Xác nhận hủy phiếu nhập này? Hàng sẽ bị xóa khỏi kho."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAction && action.mutate(confirmAction)} disabled={action.isPending}>
              {action.isPending ? "Đang xử lý..." : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
