import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getWarrantyRequestById,
  resolveWarrantyRequest,
  completeWarrantyRequest,
  cancelWarrantyRequest,
} from "@/services/warranty-service"
import { usePermission } from "@/hooks/use-permission"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { WARRANTY_STATUS, WARRANTY_RESOLUTION_TYPE, WARRANTY_RESULT } from "@/utils/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Check, X, Wrench } from "lucide-react"
import { toast } from "@/utils/toast"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Chờ tiếp nhận", variant: "secondary" },
  RECEIVED: { label: "Đã nhận hàng", variant: "outline" },
  UNDER_EVALUATION: { label: "Đang xử lý", variant: "default" },
  RESOLVED: { label: "Hoàn tất", variant: "default" },
}

export const WarrantyDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()
  void perm

  const [dialog, setDialog] = useState<"resolve" | "complete" | "cancel" | null>(null)
  const [resolutionType, setResolutionType] = useState("")
  const [rmaNumber, setRmaNumber] = useState("")
  const [expectedReturnAt, setExpectedReturnAt] = useState("")
  const [partnerNote, setPartnerNote] = useState("")
  const [result, setResult] = useState("")
  const [cancelNote, setCancelNote] = useState("")
  const [resolveNote, setResolveNote] = useState("")

  const { data: wr, isLoading } = useQuery({
    queryKey: ["warranty-request", id],
    queryFn: () => getWarrantyRequestById(Number(id)),
    enabled: !!id,
  })

  const resolveMut = useMutation({
    mutationFn: () =>
      resolveWarrantyRequest(Number(id!), {
        resolutionType,
        rmaNumber: rmaNumber.trim() || undefined,
        expectedReturnAt: expectedReturnAt || undefined,
        partnerNote: partnerNote.trim() || undefined,
        note: resolveNote.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranty-request", id] })
      qc.invalidateQueries({ queryKey: ["warranty-requests"] })
      setDialog(null)
      resetResolve()
      toast.success("Đã xử lý phiếu bảo hành")
    },
    onError: (err: Error) => toast.error(err.message || "Xử lý thất bại"),
  })

  const completeMut = useMutation({
    mutationFn: () => completeWarrantyRequest(Number(id!), { result, note: resolveNote.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranty-request", id] })
      qc.invalidateQueries({ queryKey: ["warranty-requests"] })
      setDialog(null)
      setResult("")
      setResolveNote("")
      toast.success("Đã hoàn tất phiếu bảo hành")
    },
    onError: (err: Error) => toast.error(err.message || "Hoàn tất thất bại"),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelWarrantyRequest(Number(id!), { note: cancelNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranty-request", id] })
      qc.invalidateQueries({ queryKey: ["warranty-requests"] })
      setDialog(null)
      setCancelNote("")
      toast.success("Đã hủy phiếu bảo hành")
    },
    onError: (err: Error) => toast.error(err.message || "Hủy thất bại"),
  })

  const resetResolve = () => {
    setResolutionType("")
    setRmaNumber("")
    setExpectedReturnAt("")
    setPartnerNote("")
    setResolveNote("")
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )

  if (!wr)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty>
          <EmptyTitle>Không tìm thấy phiếu bảo hành.</EmptyTitle>
        </Empty>
      </div>
    )

  const st = statusLabel[wr.status] ?? { label: wr.status, variant: "secondary" as const }
  const canResolve = wr.status === WARRANTY_STATUS.RECEIVED || wr.status === WARRANTY_STATUS.UNDER_EVALUATION
  const canComplete = wr.status === WARRANTY_STATUS.UNDER_EVALUATION
  const canCancel = wr.status === WARRANTY_STATUS.PENDING || wr.status === WARRANTY_STATUS.RECEIVED

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/warranty")}>Bảo hành</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{wr.requestCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Badge variant={st.variant}>{st.label}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{wr.requestCode}</span>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Sản phẩm</span>
            <p className="font-medium text-base mt-0.5">{wr.productName}</p>
            <p className="text-xs text-muted-foreground">{wr.productSku}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Serial</span>
            <p className="font-mono text-sm mt-0.5">{wr.serialNumber}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Khách hàng</span>
            <p className="font-medium mt-0.5">{wr.customerName ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Ngày tạo</span>
            <p className="mt-0.5">{new Date(wr.createdAt).toLocaleString("vi-VN")}</p>
          </div>
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Mô tả lỗi</span>
          <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{wr.issueDescription}</p>
        </div>

        {wr.note && (
          <div>
            <span className="text-sm text-muted-foreground">Ghi chú</span>
            <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{wr.note}</p>
          </div>
        )}

        {wr.resolutionType && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-6 text-sm pt-2">
              <div>
                <span className="text-muted-foreground">Hướng xử lý</span>
                <p className="font-medium mt-0.5">{wr.resolutionType}</p>
              </div>
              {wr.replacementSerialNumber && (
                <div>
                  <span className="text-muted-foreground">Serial thay thế</span>
                  <p className="font-mono text-sm mt-0.5">{wr.replacementSerialNumber}</p>
                </div>
              )}
              {wr.rmaNumber && (
                <div>
                  <span className="text-muted-foreground">RMA</span>
                  <p className="font-mono text-sm mt-0.5">{wr.rmaNumber}</p>
                </div>
              )}
              {wr.handledByName && (
                <div>
                  <span className="text-muted-foreground">Người xử lý</span>
                  <p className="font-medium mt-0.5">{wr.handledByName}</p>
                </div>
              )}
              {wr.completedAt && (
                <div>
                  <span className="text-muted-foreground">Hoàn tất lúc</span>
                  <p className="mt-0.5">{new Date(wr.completedAt).toLocaleString("vi-VN")}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {canCancel && (
          <Button variant="outline" className="text-destructive" onClick={() => setDialog("cancel")}>
            <X className="size-4 mr-1" /> Hủy phiếu
          </Button>
        )}
        {canComplete && (
          <Button onClick={() => setDialog("complete")}>
            <Check className="size-4 mr-1" /> Hoàn tất
          </Button>
        )}
        {canResolve && (
          <Button onClick={() => setDialog("resolve")}>
            <Wrench className="size-4 mr-1" /> Xử lý
          </Button>
        )}
      </div>

      <Dialog
        open={dialog === "resolve"}
        onOpenChange={(v) => {
          if (!v) {
            setDialog(null)
            resetResolve()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Xử lý bảo hành</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Hướng xử lý <span className="text-destructive">*</span>
                </Label>
                <Select value={resolutionType} onValueChange={setResolutionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn hướng xử lý" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WARRANTY_RESOLUTION_TYPE.REPAIR}>🔧 Sửa chữa</SelectItem>
                    <SelectItem value={WARRANTY_RESOLUTION_TYPE.REPLACE}>🔄 Đổi mới</SelectItem>
                    <SelectItem value={WARRANTY_RESOLUTION_TYPE.REFUND}>💰 Hoàn tiền</SelectItem>
                    <SelectItem value={WARRANTY_RESOLUTION_TYPE.REJECT}>🚫 Từ chối</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {resolutionType === WARRANTY_RESOLUTION_TYPE.REPLACE && (
                <div className="space-y-2">
                  <Label htmlFor="rma">Serial thay thế (nếu có)</Label>
                  <Input
                    id="rma"
                    value={rmaNumber}
                    onChange={(e) => setRmaNumber(e.target.value)}
                    placeholder="Nhập serial sản phẩm thay thế..."
                  />
                </div>
              )}

              {resolutionType === WARRANTY_RESOLUTION_TYPE.REPAIR && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rma">RMA number (nếu gửi NCC)</Label>
                    <Input
                      id="rma"
                      value={rmaNumber}
                      onChange={(e) => setRmaNumber(e.target.value)}
                      placeholder="VD: RMA-2026-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected">Dự kiến trả hàng</Label>
                    <Input
                      id="expected"
                      type="date"
                      value={expectedReturnAt}
                      onChange={(e) => setExpectedReturnAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partnerNote">Ghi chú từ NCC</Label>
                    <Textarea
                      id="partnerNote"
                      value={partnerNote}
                      onChange={(e) => setPartnerNote(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="resolveNote">Ghi chú</Label>
                <Textarea
                  id="resolveNote"
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialog(null)
                resetResolve()
              }}
            >
              Hủy
            </Button>
            <Button onClick={() => resolveMut.mutate()} disabled={!resolutionType || resolveMut.isPending}>
              {resolveMut.isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "complete"}
        onOpenChange={(v) => {
          if (!v) {
            setDialog(null)
            setResult("")
            setResolveNote("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hoàn tất phiếu bảo hành</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Kết quả <span className="text-destructive">*</span>
              </Label>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kết quả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WARRANTY_RESULT.REPAIRED}>Đã sửa xong</SelectItem>
                  <SelectItem value={WARRANTY_RESULT.REPLACED}>Đã đổi hàng</SelectItem>
                  <SelectItem value={WARRANTY_RESULT.REFUNDED}>Đã hoàn tiền</SelectItem>
                  <SelectItem value={WARRANTY_RESULT.REJECTED}>Đã từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialog(null)
                setResult("")
                setResolveNote("")
              }}
            >
              Hủy
            </Button>
            <Button onClick={() => completeMut.mutate()} disabled={!result || completeMut.isPending}>
              {completeMut.isPending ? "Đang hoàn tất..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "cancel"}
        onOpenChange={(v) => {
          if (!v) {
            setDialog(null)
            setCancelNote("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy phiếu bảo hành</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Lý do hủy <span className="text-destructive">*</span>
            </Label>
            <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialog(null)
                setCancelNote("")
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMut.mutate()}
              disabled={!cancelNote.trim() || cancelMut.isPending}
            >
              {cancelMut.isPending ? "Đang hủy..." : "Xác nhận hủy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
