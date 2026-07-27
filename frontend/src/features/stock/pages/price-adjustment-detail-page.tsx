import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getPriceAdjustmentById,
  approvePriceAdjustment,
  rejectPriceAdjustment,
} from "@/services/price-adjustment-service"
import { usePermission } from "@/hooks/use-permission"
import { ADJUSTMENT_STATUS } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, X } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/utils/toast"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ duyệt", variant: "outline" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
}

export function PriceAdjustmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null)
  const [approvalNote, setApprovalNote] = useState("")

  const { data: adj, isLoading } = useQuery({
    queryKey: ["price-adjustment", id],
    queryFn: () => getPriceAdjustmentById(Number(id)),
    enabled: !!id,
  })

  const action = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      if (action === "approve") return approvePriceAdjustment(Number(id), approvalNote || undefined)
      return rejectPriceAdjustment(Number(id), approvalNote || undefined)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-adjustment", id] })
      qc.invalidateQueries({ queryKey: ["price-adjustments"] })
      toast.success("Thao tác thành công")
      setConfirmAction(null)
    },
    onError: (e: Error) => {
      toast.error(e.message)
      setConfirmAction(null)
    },
  })

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (!adj)
    return (
      <Empty>
        <EmptyTitle>Không tìm thấy phiếu điều chỉnh giá</EmptyTitle>
      </Empty>
    )

  const s = statusLabel[adj.status] ?? { label: adj.status, variant: "secondary" }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/price-adjustments")}>Điều chỉnh giá</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{adj.adjustCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{adj.adjustCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        {perm.canApprove() && adj.status === ADJUSTMENT_STATUS.PENDING && adj.createdBy !== perm.user?.id && (
          <div className="flex gap-2">
            <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("reject")}>
              <X className="size-4 mr-1" /> Từ chối
            </Button>
            <Button onClick={() => setConfirmAction("approve")}>
              <Check className="size-4 mr-1" /> Duyệt
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Sản phẩm:</span>
              <p className="font-medium">
                {adj.productName ?? "—"}{" "}
                {adj.productSku && <span className="text-muted-foreground">({adj.productSku})</span>}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Giá cũ:</span>
              <p className="font-medium">{(adj.oldPrice ?? 0).toLocaleString("vi-VN")}₫</p>
            </div>
            <div>
              <span className="text-muted-foreground">Giá mới:</span>
              <p className="font-medium">{(adj.newPrice ?? 0).toLocaleString("vi-VN")}₫</p>
            </div>
            <div>
              <span className="text-muted-foreground">Người tạo:</span>
              <p className="font-medium">{adj.createdByName ?? "—"}</p>
            </div>
            {adj.approvedByName && (
              <div>
                <span className="text-muted-foreground">Người duyệt:</span>
                <p className="font-medium">{adj.approvedByName}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm">
            <span className="text-xs font-medium text-muted-foreground tracking-wide">LÝ DO</span>
            <p className="mt-1">{adj.reason}</p>
          </div>
        </CardContent>
      </Card>

      {adj.approvalNote && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">GHI CHÚ DUYỆT</span>
              <p className="mt-1">{adj.approvalNote}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(v) => {
          if (!v) setConfirmAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve" ? "Duyệt điều chỉnh giá" : "Từ chối điều chỉnh giá"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Xác nhận {confirmAction === "approve" ? "duyệt" : "từ chối"} phiếu điều chỉnh giá này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              <Label>{confirmAction === "reject" ? "Lý do từ chối *" : "Ghi chú (không bắt buộc)"}</Label>
              <Input
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder={confirmAction === "reject" ? "Nhập lý do từ chối" : undefined}
              />
              {confirmAction === "reject" && !approvalNote.trim() && (
              <p className="text-xs text-destructive">Vui lòng nhập lý do từ chối</p>
            )}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && action.mutate(confirmAction)}
              disabled={action.isPending || (confirmAction === "reject" && !approvalNote.trim())}
            >
              {action.isPending ? "Đang xử lý..." : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
