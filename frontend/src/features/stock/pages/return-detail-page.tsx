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
import { Check, X } from "lucide-react"
import { toast } from "@/utils/toast"
import { EXPORT_RECEIPT_STATUS } from "@/utils/types"

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
  const canApprove = receipt.status === EXPORT_RECEIPT_STATUS.PENDING_APPROVAL && perm.hasRole(...ROLES.CAN_APPROVE)
  const canCancel = receipt.status === EXPORT_RECEIPT_STATUS.PENDING_APPROVAL

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
              {receipt.originalExportReceiptId ? `#${receipt.originalExportReceiptId}` : "—"}
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
                <span className="font-mono text-xs text-muted-foreground w-24">Unit #{item.productUnitId}</span>
                <span className="flex-1">
                  <span className="font-medium">Product #{item.productId}</span>
                  <span className="text-xs text-muted-foreground ml-2">x{item.quantity}</span>
                </span>
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
        {canCancel && (
          <Button variant="outline" className="text-destructive" onClick={() => setShowCancel(true)}>
            <X className="size-4 mr-1" /> Hủy phiếu
          </Button>
        )}
        {canApprove && (
          <Button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
            <Check className="size-4 mr-1" /> Duyệt
          </Button>
        )}
      </div>

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
