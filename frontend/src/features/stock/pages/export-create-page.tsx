import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { createExportReceipt } from "@/features/stock/services/export-service"
import { getProducts } from "@/features/stock/services/product-service"
import { getCustomers } from "@/features/stock/services/customer-service"
import type { ProductResponse, CustomerResponse, ResponsePage, ExportReason } from "@/utils/types"
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
import { Trash2, Plus } from "lucide-react"

interface LineItem {
  tempId: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
}

const reasons: { value: ExportReason; label: string }[] = [
  { value: "sale", label: "Bán hàng" },
  { value: "internal", label: "Xuất nội bộ" },
  { value: "return_supplier", label: "Trả nhà cung cấp" },
  { value: "disposal", label: "Hủy hàng" },
]

export function ExportCreatePage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [reason, setReason] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<LineItem[]>([])
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getProducts(0, 100).then((res: ResponsePage<ProductResponse>) => setProducts(res.content))
    getCustomers(0, 50).then((res: ResponsePage<CustomerResponse>) => setCustomers(res.content))
  }, [])

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
    if (reason === "sale" && !customerId) return
    setSubmitting(true)
    try {
      const customer = reason === "sale" ? customers.find((c) => c.id === Number(customerId)) : undefined
      await createExportReceipt(
        {
          reason: reason as ExportReason,
          customerId: customer?.id ?? null,
          customerName: customer?.name ?? null,
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
        user.fullName,
      )
      navigate("/stock/exports")
    } finally {
      setSubmitting(false)
    }
  }

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
        {reason === "sale" && (
          <div className="space-y-2">
            <Label htmlFor="customer">Khách hàng</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Chọn khách hàng" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <div className="rounded-lg border">
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
          disabled={!reason || items.length === 0 || submitting || (reason === "sale" && !customerId)}
        >
          {submitting ? "Đang tạo..." : "Tạo phiếu xuất"}
        </Button>
      </div>
    </div>
  )
}
