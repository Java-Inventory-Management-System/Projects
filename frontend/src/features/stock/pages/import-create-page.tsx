import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { createImportReceipt, getProducts } from "@/mock-services"
import type { ProductResponse, ResponsePage } from "@/utils/types"
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
  warrantyMonths: number
}

const suppliers = [
  { id: 1, name: "Intel Vietnam" },
  { id: 2, name: "Corsair Asia Pte Ltd" },
  { id: 3, name: "Samsung Vina" },
  { id: 4, name: "ASUS Technology Vietnam" },
  { id: 5, name: "Western Digital Vietnam" },
]

export function ImportCreatePage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [supplierId, setSupplierId] = useState("")
  const [referenceDoc, setReferenceDoc] = useState("")
  const [note, setNote] = useState("")
  const [serialInput, setSerialInput] = useState("")
  const [items, setItems] = useState<LineItem[]>([])
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getProducts(0, 100).then((res: ResponsePage<ProductResponse>) => setProducts(res.content))
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
        unitPrice: 0,
        warrantyMonths: 12,
      },
    ])
    setSelectedProductId("")
  }

  const updateItem = (tempId: number, field: keyof LineItem, value: number) => {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, [field]: value } : i)))
  }

  const removeItem = (tempId: number) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

  const handleSubmit = async () => {
    if (!supplierId || !user || items.length === 0) return
    setSubmitting(true)
    try {
      await createImportReceipt(
        {
          supplierId: Number(supplierId),
          supplierName: suppliers.find((s) => s.id === Number(supplierId))?.name ?? "",
          referenceDoc: referenceDoc || null,
          note: note || null,
          totalAmount,
          items: items.map((i) => ({
            id: 0,
            productId: i.productId,
            productName: i.productName,
            productSku: i.productSku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            warrantyMonths: i.warrantyMonths,
          })),
        },
        user.id,
        user.fullName,
      )
      navigate("/stock/imports")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/imports")}>
          ← Quay lại
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu nhập kho</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplier">Nhà cung cấp</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger id="supplier">
              <SelectValue placeholder="Chọn NCC" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ref">Chứng từ tham chiếu</Label>
          <Input id="ref" placeholder="Số hóa đơn (nếu có)" value={referenceDoc} onChange={(e) => setReferenceDoc(e.target.value)} />
        </div>
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
                  {p.name} ({p.sku})
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
                <TableHead className="w-20 text-right">BH (th)</TableHead>
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
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-16 text-right"
                      value={item.warrantyMonths}
                      onChange={(e) => updateItem(item.tempId, "warrantyMonths", Number(e.target.value))}
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
          Tổng: {totalAmount.toLocaleString("vi-VN")}₫
        </span>
        {items.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="serial">Serial numbers (mỗi dòng một serial)</Label>
            <Textarea
              id="serial"
              placeholder="Nhập serial, cách nhau bằng xuống dòng..."
              className="h-24 font-mono text-xs"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Cần {items.reduce((s, i) => s + i.quantity, 0)} serial, đã nhập {serialInput.split("\n").filter(Boolean).length}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea id="note" placeholder="Ghi chú (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/imports")}>Hủy</Button>
        <Button onClick={handleSubmit} disabled={!supplierId || items.length === 0 || submitting}>
          {submitting ? "Đang tạo..." : "Tạo phiếu nhập"}
        </Button>
      </div>
    </div>
  )
}
