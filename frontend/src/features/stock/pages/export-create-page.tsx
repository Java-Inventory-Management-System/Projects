import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { createExportReceipt } from "@/features/stock/services/export-service"
import { getProducts } from "@/features/stock/services/product-service"
import { getSerialsForExport } from "@/mock-services"
import { CustomerSelectModal } from "@/features/stock/components/customer-select-modal"
import type { ProductResponse, ResponsePage, ExportReason, ProductUnit } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, Plus, Search } from "lucide-react"
import { toast } from "@/utils/toast"

interface LineItem {
  tempId: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
}

const reasons: { value: ExportReason; label: string }[] = [
  { value: "SALE", label: "Bán hàng" },
  { value: "INTERNAL", label: "Xuất nội bộ" },
  { value: "RETURN_SUPPLIER", label: "Trả nhà cung cấp" },
  { value: "DISPOSE", label: "Hủy hàng" },
]

export function ExportCreatePage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [reason, setReason] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<LineItem[]>([])
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [customerName, setCustomerName] = useState("")
  const [selectModalOpen, setSelectModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serials, setSerials] = useState<Record<number, ProductUnit[]>>({})

  useEffect(() => {
    getProducts(0, 100).then((res: ResponsePage<ProductResponse>) => setProducts(res.content))
  }, [])

  useEffect(() => {
    if (items.length === 0) { setSerials({}); return }
    const tempIds = items.map((i) => i.tempId)
    Promise.all(items.map((i) => getSerialsForExport(i.productId, i.quantity))).then((results) => {
      const map: Record<number, ProductUnit[]> = {}
      results.forEach((serials, idx) => { map[tempIds[idx]] = serials })
      setSerials(map)
    })
  }, [items])

  const addItem = () => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === Number(selectedProductId))
    if (!product) return
    setItems((prev) => [
      ...prev,
      {
        tempId: Date.now(),
        productId: product.id,
        productName: product.name,
        productSku: product.sku ?? "",
        quantity: 1,
        unitPrice: product.sellPrice ?? 0,
      },
    ])
    setSelectedProductId("")
  }

  const updateItem = (tempId: number, field: "quantity" | "unitPrice", value: number) => {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, [field]: value } : i)))
  }

  const removeItem = (tempId: number) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  const handleSubmit = async () => {
    if (!reason || !user || items.length === 0) return
    if (reason === "SALE" && !customerId) { toast.error("Vui lòng chọn khách hàng"); return }
    setSubmitting(true)
    try {
      await createExportReceipt(
        {
          reason: reason as ExportReason,
          customerId: customerId ? Number(customerId) : null,
          customerName: customerName || null,
          note: note || null,
          items: items.map((i) => ({
            id: 0,
            productId: i.productId,
            productName: i.productName,
            productSku: i.productSku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
        user.id,
        user.displayName,
      )
      toast.success("Tạo phiếu xuất thành công")
      navigate("/stock/exports")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  const hasSerials = Object.values(serials).some((arr) => arr.length > 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/exports")}>
          &larr; Quay lại
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu xuất kho</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reason">Lý do xuất</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="reason">
              <SelectValue placeholder="Chọn lý do" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {reason === "SALE" && (
          <div className="space-y-2">
            <Label htmlFor="customer">Khách hàng</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 justify-start font-normal h-10"
                onClick={() => setSelectModalOpen(true)}
              >
                {customerId ? (
                  <span className="truncate">{customerName}</span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Search className="size-4" />
                    Tìm kiếm / Chọn khách hàng...
                  </span>
                )}
              </Button>
              {customerId && (
                <Button variant="ghost" size="icon" onClick={() => { setCustomerId(""); setCustomerName("") }}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Thêm sản phẩm</Label>
        <div className="flex gap-2">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Chọn sản phẩm..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name} ({p.sku}) &mdash; {p.sellPrice?.toLocaleString("vi-VN")}₫
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addItem} disabled={!selectedProductId}>
            <Plus className="size-4 mr-1" /> Thêm
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="w-20 text-right">SL</TableHead>
                <TableHead className="w-28 text-right">Đơn giá</TableHead>
                <TableHead className="w-28 text-right">Thành tiền</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.tempId}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-16 text-right"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.tempId, "quantity", Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-24 text-right"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.tempId, "unitPrice", Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.tempId)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {items.length > 0 && hasSerials && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Serial dự kiến xuất theo FIFO</h3>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Ngày nhập</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const itemSerials = serials[item.tempId] ?? []
                  if (itemSerials.length === 0) return null
                  return itemSerials.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-muted-foreground">{item.productName}</TableCell>
                      <TableCell className="font-mono text-xs">{s.serialNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{s.locationCode ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.importedAt).toLocaleDateString("vi-VN")}</TableCell>
                    </TableRow>
                  ))
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          Tổng: {items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString("vi-VN")}₫
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea id="note" placeholder="Ghi chú (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/exports")}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          disabled={!reason || items.length === 0 || submitting || (reason === "SALE" && !customerId)}
        >
          {submitting ? "Đang tạo..." : "Tạo phiếu xuất"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleSubmit}
          disabled={!reason || items.length === 0 || submitting || (reason === "SALE" && !customerId)}
        >
          {submitting ? "Đang tạo..." : "Xuất tạm"}
        </Button>
      </div>

      <CustomerSelectModal
        open={selectModalOpen}
        onOpenChange={setSelectModalOpen}
        selectedCustomerId={customerId ? Number(customerId) : null}
        onSelect={(id, name) => { setCustomerId(String(id)); setCustomerName(name) }}
      />
    </div>
  )
}
