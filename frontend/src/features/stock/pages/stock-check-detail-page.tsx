import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getStockCheckById,
  recordStockCheckItems,
  completeStockCheck,
  approveStockCheck,
  rejectStockCheck,
} from "@/services/stock-check-service"
import { useAuthStore } from "@/store/auth-store"
import type { StockCheckItem } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Check, X, Save, ClipboardCheck, Upload, Search } from "lucide-react"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ButtonGroup } from "@/components/ui/button-group"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { toast } from "@/utils/toast"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ xử lý", variant: "secondary" },
  IN_PROGRESS: { label: "Đang kiểm", variant: "outline" },
  COMPLETED: { label: "Chờ duyệt", variant: "default" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
}

const statusOptions = [
  "IN_STOCK",
  "DEFECTIVE",
  "DAMAGED_IN_STORAGE",
  "LOST",
  "REMOVED",
  "DISPOSED",
] as const

export const StockCheckDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [localItems, setLocalItems] = useState<StockCheckItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [approvalModal, setApprovalModal] = useState<"approve" | "reject" | null>(null)
  const [approvalNote, setApprovalNote] = useState("")

  const { data: check, isLoading } = useQuery({
    queryKey: ["stock-check", id],
    queryFn: () => getStockCheckById(Number(id)),
    enabled: !!id,
  })

  useEffect(() => {
    if (check) setLocalItems(check.items)
  }, [check])

  const updateItem = useCallback((itemId: number, field: keyof StockCheckItem, value: unknown) => {
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)))
  }, [])

  const recordMut = useMutation({
    mutationFn: (data: { items: Array<{ productUnitId: number; actualStatus?: string; countedQuantity?: number; note?: string }> }) =>
      recordStockCheckItems(Number(id!), data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock-check", id] }); toast.success("Đã ghi nhận kết quả kiểm") },
    onError: (err: Error) => toast.error(err.message || "Ghi nhận thất bại"),
  })

  const completeMut = useMutation({
    mutationFn: () => completeStockCheck(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      toast.success("Phiếu kiểm đã hoàn tất, chờ duyệt")
      navigate("/stock/checks")
    },
    onError: (err: Error) => toast.error(err.message || "Hoàn tất thất bại"),
  })

  const approveMut = useMutation({
    mutationFn: () => approveStockCheck(Number(id!), approvalNote || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      setApprovalModal(null); setApprovalNote("")
      toast.success("Đã duyệt phiếu kiểm")
      navigate("/stock/checks")
    },
    onError: (err: Error) => toast.error(err.message || "Duyệt thất bại"),
  })

  const rejectMut = useMutation({
    mutationFn: () => rejectStockCheck(Number(id!), approvalNote || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      setApprovalModal(null); setApprovalNote("")
      toast.success("Đã từ chối phiếu kiểm")
      navigate("/stock/checks")
    },
    onError: (err: Error) => toast.error(err.message || "Từ chối thất bại"),
  })

  const serialFileRef = useRef<HTMLInputElement>(null)

  const handleImportSerials = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      const imported = content
        .split(/[\n\r]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      if (imported.length === 0) { toast.error("File không có serial hợp lệ"); return }

      const importedSet = new Set(imported)
      let matchCount = 0
      let missCount = 0
      setLocalItems((prev) =>
        prev.map((i) => {
          if (importedSet.has(i.serialNumber)) {
            matchCount++
            return { ...i, actualStatus: "IN_STOCK" }
          }
          missCount++
          return { ...i, actualStatus: "LOST" }
        }),
      )
      toast.success(`Import ${imported.length} serial: ${matchCount} khớp, ${missCount} thiếu`)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleSaveAndComplete = async () => {
    const items = localItems.map((i) => ({
      productUnitId: i.productUnitId,
      actualStatus: i.actualStatus ?? undefined,
      countedQuantity: i.countedQuantity ?? undefined,
      note: i.note || undefined,
    }))
    try {
      await recordMut.mutateAsync({ items })
      completeMut.mutate()
    } catch { /* toast handled by mutation */ }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!check) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty><EmptyTitle>Không tìm thấy phiếu kiểm.</EmptyTitle></Empty>
      </div>
    )
  }

  const s = statusLabel[check.status] ?? { label: check.status, variant: "secondary" }
  const isStockRole = user?.role === "STOCK"
  const isManagerRole = user?.role === "MANAGER" || user?.role === "ADMIN"
  const canEdit = (check.status === "PENDING" || check.status === "IN_PROGRESS") && isStockRole
  const canApprove = check.status === "COMPLETED" && isManagerRole
  const mismatchCount = localItems.filter((i) => i.difference && i.difference !== "MATCH").length

  const filteredItems = localItems.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.serialNumber.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.productSku.toLowerCase().includes(q)
    )
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/stock/checks")}>Kiểm kho</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{check.checkCode}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-3">
        <Badge variant={s.variant}>{s.label}</Badge>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Kiểm kho</TabsTrigger>
          <TabsTrigger value="results">Kết quả</TabsTrigger>
          <TabsTrigger value="actions">Hành động</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Người tạo:</span>
          <p className="font-medium">{check.createdByName}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Ngày tạo:</span>
          <p className="font-medium">{new Date(check.createdAt).toLocaleString("vi-VN")}</p>
        </div>
        {check.approvedByName && (
          <div>
            <span className="text-muted-foreground">Người duyệt:</span>
            <p className="font-medium">{check.approvedByName}</p>
          </div>
        )}
        {check.approvalNote && (
          <div>
            <span className="text-muted-foreground">Ghi chú duyệt:</span>
            <p className="font-medium">{check.approvalNote}</p>
          </div>
        )}
        {check.note && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Ghi chú:</span>
            <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-3 py-2">{check.note}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 text-sm">
        <Badge variant="outline">Tổng: {check.totalItems}</Badge>
        <Badge variant="secondary">Khớp: {check.matchCount}</Badge>
        <Badge variant="outline" className="text-destructive">Thiếu: {check.missingCount}</Badge>
        <Badge variant="outline" className="text-destructive">Lỗi: {check.unexpectedCount}</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        {canEdit && (check.status === "PENDING" || check.status === "IN_PROGRESS") &&
          "Upload file CSV/TXT chứa danh sách serial còn trong kho. Serial không có trong file sẽ tự động set Mất."
        }
      </p>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo serial, sản phẩm, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        {mismatchCount > 0 && (
          <span className="text-xs text-destructive">{mismatchCount} chênh lệch</span>
        )}
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Serial</TableHead>
              <TableHead className="min-w-[160px]">Sản phẩm</TableHead>
              <TableHead className="w-24">Expected</TableHead>
              <TableHead className="w-40">Actual</TableHead>
              <TableHead className="w-20 text-right">SL đếm</TableHead>
              <TableHead className="w-24">Chênh lệch</TableHead>
              <TableHead className="min-w-[140px]">Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Không tìm thấy kết quả phù hợp
                </TableCell>
              </TableRow>
            ) : filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.serialNumber}</TableCell>
                <TableCell>
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-xs text-muted-foreground ml-1">{item.productSku}</span>
                </TableCell>
                <TableCell>{item.expectedStatus}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Select
                      value={item.actualStatus ?? ""}
                      onValueChange={(v) => updateItem(item.id, "actualStatus", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Chọn..." />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((st) => (
                          <SelectItem key={st} value={st} className="text-xs">
                            {st === "IN_STOCK" ? "Tồn kho" :
                             st === "DEFECTIVE" ? "Lỗi" :
                             st === "DAMAGED_IN_STORAGE" ? "Hư hỏng" :
                             st === "LOST" ? "Mất" :
                             st === "REMOVED" ? "Đã loại" : "Hủy"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    item.actualStatus ?? "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canEdit ? (
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-20 text-right"
                      value={item.countedQuantity ?? ""}
                      onChange={(e) => updateItem(item.id, "countedQuantity", e.target.value ? Number(e.target.value) : null)}
                    />
                  ) : (
                    item.countedQuantity ?? "—"
                  )}
                </TableCell>
                <TableCell>
                  {item.difference ? (
                    <Badge variant={item.difference === "MATCH" ? "secondary" : "destructive"} className="text-xs">
                      {item.difference === "MATCH" ? "Khớp" :
                       item.difference === "MISSING" ? "Thiếu" :
                       item.difference === "UNEXPECTED" ? "Lỗi" : "Thiếu 1 phần"}
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Input
                      className="h-8 text-xs"
                      value={item.note ?? ""}
                      onChange={(e) => updateItem(item.id, "note", e.target.value || null)}
                    />
                  ) : (
                    item.note ?? "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
      <div className="flex justify-between gap-3">
        {canEdit && (
          <ButtonGroup>
            <input
              ref={serialFileRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={handleImportSerials}
            />
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={() => serialFileRef.current?.click()}
            >
              <Upload className="size-3" />
              Import serial đã kiểm
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setLocalItems((prev) => prev.map((i) => ({ ...i, actualStatus: "IN_STOCK" })))}
            >
              Tất cả Tồn kho
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setLocalItems((prev) => prev.map((i) => ({ ...i, actualStatus: "LOST" })))}
            >
              Tất cả Mất
            </Button>
          </ButtonGroup>
        )}
        <div className="flex gap-3 ml-auto">
          {canEdit && (
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => {
                  const items = localItems.map((i) => ({
                    productUnitId: i.productUnitId,
                    actualStatus: i.actualStatus ?? undefined,
                    countedQuantity: i.countedQuantity ?? undefined,
                    note: i.note || undefined,
                  }))
                  recordMut.mutate({ items })
                }}
                disabled={recordMut.isPending}
              >
                <Save className="size-4 mr-1" />
                {recordMut.isPending ? "Đang ghi..." : "Ghi nhận"}
              </Button>
              <Button onClick={handleSaveAndComplete} disabled={recordMut.isPending || completeMut.isPending}>
                <ClipboardCheck className="size-4 mr-1" />
                {completeMut.isPending ? "Đang hoàn tất..." : "Hoàn tất"}
              </Button>
            </ButtonGroup>
          )}
        </div>
        {canApprove && (
          <ButtonGroup>
            <Button variant="outline" onClick={() => setApprovalModal("reject")}>
              <X className="size-4 mr-1" /> Từ chối
            </Button>
            <Button onClick={() => setApprovalModal("approve")}>
              <Check className="size-4 mr-1" /> Duyệt
            </Button>
          </ButtonGroup>
        )}
        {check.status === "APPROVED" && mismatchCount > 0 && (
          <Button
            variant="default"
            onClick={() =>
              navigate("/stock/adjustments/create", {
                state: { reason: `Từ phiếu kiểm ${check.checkCode} — ${mismatchCount} item chênh lệch` },
              })
            }
          >
            <ClipboardCheck className="size-4 mr-1" />
            Tạo phiếu điều chỉnh ({mismatchCount})
          </Button>
        )}
      </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!approvalModal} onOpenChange={(v) => { if (!v) setApprovalModal(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalModal === "approve" ? "Duyệt phiếu kiểm" : "Từ chối phiếu kiểm"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Ghi chú (không bắt buộc)</label>
            <Textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Nhập ghi chú..."
              rows={3}
            />
          </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalModal(null)}>Hủy</Button>
            <Button
              onClick={() => {
                if (approvalModal === "approve") approveMut.mutate()
                else rejectMut.mutate()
              }}
              disabled={approveMut.isPending || rejectMut.isPending}
              variant={approvalModal === "reject" ? "destructive" : "default"}
            >
              {approvalModal === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
