import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getExportReceiptById, fulfillExportReceipt } from "@/services/export-service"
import { getAllSerialsForProduct } from "@/services/product-unit-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/utils/toast"
import { EXPORT_RECEIPT_STATUS, type ProductUnit } from "@/utils/types"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { ScanLine } from "lucide-react"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ duyệt", variant: "outline" },
  APPROVED: { label: "Đã duyệt", variant: "secondary" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

export function ExportFulfillPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [serialPicker, setSerialPicker] = useState<{ exportItemId: number; productId: number; productName: string } | null>(null)
  const [allSerials, setAllSerials] = useState<ProductUnit[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [serialsPerItem, setSerialsPerItem] = useState<Record<number, string[]>>({})
  const [serialsLoading, setSerialsLoading] = useState(false)

  const [fulfilledQtys, setFulfilledQtys] = useState<Record<number, number>>({})

  const { scanning, barcodeInput, setBarcodeInput, videoRef, stopCamera, toggleCamera } = useBarcodeScanner(
    (rawValue) => {
      if (!serialPicker) return
      const match = allSerials.find((s) => s.serialNumber === rawValue)
      if (match && !selectedIds.includes(match.id)) {
        setSelectedIds((prev) => [...prev, match.id])
        toast.success(`Đã quét: ${rawValue}`)
      }
    }
  )

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["export-receipt", id],
    queryFn: () => getExportReceiptById(Number(id)),
    enabled: !!id,
  })

  const isSerialized = (item: { trackingType?: string }) => item.trackingType === "SERIALIZED"

  const itemsWithTracking = useMemo(() => {
    if (!receipt) return []
    return receipt.items
  }, [receipt])

  useEffect(() => {
    if (!receipt) return
    const initial: Record<number, number> = {}
    receipt.items.forEach((item) => { initial[item.id] = item.quantity })
    setFulfilledQtys(initial)
  }, [receipt])

  const openSerialPicker = async (item: typeof itemsWithTracking[0]) => {
    setSerialPicker({ exportItemId: item.id, productId: item.productId, productName: item.productName })
    setSerialsLoading(true)
    const all = await getAllSerialsForProduct(item.productId)
    setAllSerials(all)
    const saved = serialsPerItem[item.id]
    if (saved?.length) {
      const ids = all.filter((s) => saved.includes(s.serialNumber)).map((s) => s.id)
      setSelectedIds(ids)
    } else {
      setSelectedIds([])
    }
    setSerialsLoading(false)
  }

  const fulfillMut = useMutation({
    mutationFn: () => {
      if (!receipt) throw new Error("No receipt")
      return fulfillExportReceipt(receipt.id, {
        items: receipt.items.map((item) => {
          if (isSerialized(item)) {
            return { itemId: item.id, serialNumbers: serialsPerItem[item.id] ?? [] }
          }
          return { itemId: item.id, actualQuantity: fulfilledQtys[item.id] ?? 0 }
        }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["export-receipt", id] })
      qc.invalidateQueries({ queryKey: ["export-receipts"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["inventory-summary"] })
      toast.success("Xuất kho thành công")
      navigate(`/stock/exports/${receipt!.id}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!receipt) return <Empty><EmptyTitle>Không tìm thấy phiếu xuất</EmptyTitle></Empty>

  const s = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" as const }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/stock/exports")}>Xuất kho</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Thực hiện xuất {receipt.receiptCode}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{receipt.receiptCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Lý do xuất:</span><p className="font-medium">{receipt.reason}</p></div>
            <div><span className="text-muted-foreground">Ngày tạo:</span><p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p></div>
            {receipt.customerName && <div><span className="text-muted-foreground">Khách hàng:</span><p className="font-medium">{receipt.customerName}</p></div>}
            <div><span className="text-muted-foreground">Người tạo:</span><p className="font-medium">{receipt.createdByName || "—"}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="w-16 text-right">Yêu cầu</TableHead>
                <TableHead className="w-20 text-right">Loại</TableHead>
                <TableHead className="w-24 text-right">Thực xuất</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsWithTracking.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.productSku}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-[10px]">
                      {isSerialized(item) ? "SERIAL" : "BULK"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isSerialized(item) ? (
                      <Button variant="outline" size="sm" onClick={() => openSerialPicker(item)}>
                        {serialsPerItem[item.id]?.length ? `Đã chọn ${serialsPerItem[item.id].length} serial` : "Chọn serial"}
                      </Button>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        className="h-8 w-20 text-right ml-auto"
                        value={fulfilledQtys[item.id] ?? item.quantity}
                        onChange={(e) => setFulfilledQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {receipt.status === EXPORT_RECEIPT_STATUS.APPROVED && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate("/stock/exports")}>Quay lại</Button>
          <Button onClick={() => setConfirmOpen(true)}>Xác nhận xuất kho</Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(v) => { if (!v) setConfirmOpen(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xuất kho</AlertDialogTitle>
            <AlertDialogDescription>Hàng sẽ được xuất khỏi kho. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => { fulfillMut.mutate(); setConfirmOpen(false) }} disabled={fulfillMut.isPending}>
              {fulfillMut.isPending ? "Đang xử lý..." : "Xác nhận xuất"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!serialPicker} onOpenChange={(v) => { if (!v) { setSerialPicker(null); stopCamera() } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chọn serial xuất kho</DialogTitle>
            <DialogDescription>{serialPicker?.productName} — chọn serial cần xuất.</DialogDescription>
          </DialogHeader>

          {scanning && (
            <div className="relative rounded-lg overflow-hidden bg-muted mb-2">
              <video ref={videoRef} className="w-full h-48 object-cover" playsInline muted />
              <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={stopCamera}>
                Dừng quét
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={toggleCamera}>
              <ScanLine className="size-4 mr-1.5" />
              {scanning ? "Đang quét..." : "Quét mã"}
            </Button>
            <Input
              placeholder="Nhập serial + Enter"
              className="h-8 text-sm"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !barcodeInput.trim()) return
                const match = allSerials.find((s) => s.serialNumber === barcodeInput.trim())
                if (match) {
                  if (!selectedIds.includes(match.id)) {
                    setSelectedIds((prev) => [...prev, match.id])
                  }
                  setBarcodeInput("")
                } else {
                  toast.error("Không tìm thấy serial này")
                }
              }}
            />
          </div>

          {serialsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : allSerials.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Không còn serial tồn kho</div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto space-y-1 -mx-6 px-6">
              {allSerials.map((s) => {
                const checked = selectedIds.includes(s.id)
                return (
                  <label key={s.id} className={`flex items-center gap-3 rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
                    checked ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted"
                  }`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => setSelectedIds((prev) => checked ? prev.filter((id) => id !== s.id) : [...prev, s.id])}
                      className="size-4" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-medium truncate">{s.serialNumber}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.locationCode ?? "—"} · {new Date(s.importedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => { setSerialPicker(null); stopCamera() }} className="w-full sm:w-auto">
              Hủy
            </Button>
            <Button onClick={() => {
              if (!serialPicker) return
              const serialNumbers = allSerials.filter((s) => selectedIds.includes(s.id)).map((s) => s.serialNumber)
              setSerialsPerItem((prev) => ({ ...prev, [serialPicker.exportItemId]: serialNumbers }))
              setSerialPicker(null)
              stopCamera()
            }} disabled={selectedIds.length === 0} className="w-full sm:w-auto">
              Xác nhận ({selectedIds.length} serial)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}