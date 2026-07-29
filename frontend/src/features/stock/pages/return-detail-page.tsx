import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getReturnReceiptById, approveReturnReceipt, cancelReturnReceipt } from "@/services/return-service"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Check, X, Printer, ExternalLink, Circle } from "lucide-react"
import { toast } from "@/utils/toast"
import { RETURN_RECEIPT_STATUS } from "@/utils/types"
import { cn } from "@/utils/cn"

const reasonLabel: Record<string, string> = {
  CHANGE_MIND: "Đổi ý",
  DEFECTIVE: "Hàng lỗi",
  WRONG_ITEM: "Sai hàng",
}

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "secondary" },
  COMPLETED: { label: "Đã duyệt", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

const conditionLabel: Record<string, string> = {
  GOOD: "Còn nguyên",
  DEFECTIVE: "Lỗi",
}

const actionLabel: Record<string, string> = {
  RESTOCK: "Nhập lại kho",
  SCRAP: "Hủy",
  WARRANTY_TRANSFER: "Chuyển BH",
}

export const ReturnDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [showCancel, setShowCancel] = useState(false)
  const [showApprove, setShowApprove] = useState(false)

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["return-receipt", id],
    queryFn: () => getReturnReceiptById(Number(id)),
    enabled: !!id,
  })

  const approveMut = useMutation({
    mutationFn: () => approveReturnReceipt(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["return-receipt", id] })
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      toast.success("Đã duyệt phiếu trả hàng")
    },
    onError: (err: Error) => toast.error(err.message || "Duyệt thất bại"),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelReturnReceipt(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["return-receipt", id] })
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      setShowCancel(false)
      toast.success("Đã hủy phiếu trả hàng")
    },
    onError: (err: Error) => toast.error(err.message || "Hủy thất bại"),
  })

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )

  if (!receipt)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty>
          <EmptyTitle>Không tìm thấy phiếu trả hàng.</EmptyTitle>
        </Empty>
      </div>
    )

  const st = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" as const }
  const canApprove = receipt.status === RETURN_RECEIPT_STATUS.PENDING_APPROVAL && perm.hasRole(...ROLES.CAN_APPROVE)
  const canCancel = receipt.status === RETURN_RECEIPT_STATUS.PENDING_APPROVAL

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/returns")}>Trả hàng</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{receipt.receiptCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Badge variant={st.variant}>{st.label}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{receipt.receiptCode}</span>
      </div>

      <div className="flex items-start gap-6 px-1 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Circle className={cn("size-3 fill-current", receipt.status !== RETURN_RECEIPT_STATUS.CANCELLED ? "text-blue-500" : "text-muted-foreground")} />
          <div>
            <p className="font-medium">Tạo phiếu</p>
            <p className="text-muted-foreground">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
            <p className="text-muted-foreground">{receipt.createdByName}</p>
          </div>
        </div>
        <div className="w-6 border-t border-muted-foreground/30 mt-3" />
        <div className="flex items-center gap-2">
          <Circle className={cn("size-3 fill-current", receipt.status === RETURN_RECEIPT_STATUS.COMPLETED ? "text-green-500" : receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? "text-red-500" : "text-muted-foreground")} />
          <div>
            <p className="font-medium">{receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? "Đã hủy" : "Duyệt"}</p>
            {receipt.approvedAt ? (
              <>
                <p className="text-muted-foreground">{new Date(receipt.approvedAt).toLocaleString("vi-VN")}</p>
                <p className="text-muted-foreground">{receipt.approvedByName}</p>
              </>
            ) : (
              <p className="text-muted-foreground italic">{receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? "" : "Chờ duyệt"}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Khách hàng</span>
            <p className="font-medium mt-0.5">{receipt.customerName ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Lý do</span>
            <p className="font-medium mt-0.5">{reasonLabel[receipt.reason] ?? receipt.reason}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Đơn xuất gốc</span>
            <p className="font-mono text-xs mt-0.5">
              {receipt.originalExportReceiptId
                ? <a className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(`/stock/exports/${receipt.originalExportReceiptId}`)}>
                    <ExternalLink className="size-3" /> #{receipt.originalExportReceiptId}
                  </a>
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Ngày tạo</span>
            <p className="mt-0.5">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Người tạo</span>
            <p className="font-medium mt-0.5">{receipt.createdByName}</p>
          </div>
          {receipt.approvedByName && (
            <div>
              <span className="text-muted-foreground">Người duyệt</span>
              <p className="font-medium mt-0.5">{receipt.approvedByName}</p>
            </div>
          )}
        </div>

        {receipt.note && (
          <div>
            <span className="text-sm text-muted-foreground">Ghi chú</span>
            <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{receipt.note}</p>
          </div>
        )}

        <Separator />
        <div className="space-y-2">
          <span className="text-sm font-medium">Sản phẩm trả ({receipt.items.length})</span>
          <div className="rounded-lg border divide-y text-sm">
            {receipt.items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.productName ?? `Product #${item.productId}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.serialNumber && <span className="font-mono">{item.serialNumber}</span>}
                    {item.productSku && <span className="ml-2">SKU: {item.productSku}</span>}
                    <span className="ml-2">x{item.quantity}</span>
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {conditionLabel[item.condition] ?? item.condition}
                </Badge>
                <Badge className="text-[10px]">{actionLabel[item.resultingAction] ?? item.resultingAction}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4 mr-1" /> In phiếu
        </Button>
        {canCancel && (
          <Button variant="outline" className="text-destructive" onClick={() => setShowCancel(true)}>
            <X className="size-4 mr-1" /> Hủy phiếu
          </Button>
        )}
        {canApprove && (
          <Button onClick={() => setShowApprove(true)} disabled={approveMut.isPending}>
            <Check className="size-4 mr-1" /> Duyệt
          </Button>
        )}
      </div>

      <Dialog open={showApprove} onOpenChange={(v) => { if (!v) setShowApprove(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duyệt phiếu trả hàng</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xác nhận duyệt phiếu {receipt.receiptCode}? Hàng trả sẽ được cập nhật vào kho.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(false)}>
              Quay lại
            </Button>
            <Button onClick={() => { approveMut.mutate(); setShowApprove(false) }} disabled={approveMut.isPending}>
              {approveMut.isPending ? "Đang duyệt..." : "Xác nhận duyệt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCancel}
        onOpenChange={(v) => {
          if (!v) setShowCancel(false)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy phiếu trả hàng</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc muốn hủy phiếu trả hàng này?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Quay lại
            </Button>
            <Button variant="destructive" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? "Đang hủy..." : "Xác nhận hủy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
