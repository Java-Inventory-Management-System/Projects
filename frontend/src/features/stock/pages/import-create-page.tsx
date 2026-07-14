import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { createImportReceipt, getProducts } from "@/mock-services"
import type { ProductResponse, ResponsePage } from "@/utils/types"
import { toast } from "@/utils/toast"
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
import { Trash2, Plus, ScanLine } from "lucide-react"
import { SerialModal } from "../components/serial-modal"

interface LineItem {
  tempId: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  warrantyMonths: number
  serials: string[]
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
  const [items, setItems] = useState<LineItem[]>([])
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [serialModalOpen, setSerialModalOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<number | null>(null)

  useEffect(() => {
    getProducts(0, 100).then((res: ResponsePage<ProductResponse>) => setProducts(res.content))
  }, [])

  const activeItem = items.find((i) => i.tempId === activeItemId)

  const addItem = () => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === Number(selectedProductId))
    if (!product) return
    if (items.some((i) => i.productId === product.id)) {
      toast.error("Sản phẩm này đã có trong phiếu")
      return
    }
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
        serials: [],
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

  const openSerialModal = (tempId: number) => {
    setActiveItemId(tempId)
    setSerialModalOpen(true)
  }

  const saveSerials = (tempId: number, serials: string[]) => {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, serials } : i)))
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const serialIssues = items
    .map((i) => {
      if (i.serials.length < i.quantity) return { name: i.productName, issue: `thiếu ${i.quantity - i.serials.length} serial` }
      if (i.serials.length > i.quantity) return { name: i.productName, issue: `thừa ${i.serials.length - i.quantity} serial` }
      return null
    })
    .filter(Boolean) as { name: string; issue: string }[]
  const allSerialsOk = serialIssues.length === 0

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error("Vui lòng chọn nhà cung cấp")
      return
    }
    if (items.length === 0) {
      toast.error("Chưa có sản phẩm nào trong phiếu")
      return
    }
    if (!allSerialsOk) {
      toast.error(serialIssues.map((s) => `${s.name}: ${s.issue}`).join("\n"))
      return
    }
    if (!user) return

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
      toast.success("Tạo phiếu nhập thành công")
      navigate("/stock/imports")
    } catch {
      toast.error("Có lỗi xảy ra khi tạo phiếu nhập")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/imports")}>
          &larr; Quay lại
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
                <TableHead className="w-16 text-right">SL</TableHead>
                <TableHead className="w-24 text-right">Đơn giá</TableHead>
                <TableHead className="w-14 text-right">BH</TableHead>
                <TableHead className="w-28 text-right">Thành tiền</TableHead>
                <TableHead className="w-28 text-center">Serial</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const serialCount = item.serials.length
                const serialOk = serialCount >= item.quantity
                return (
                  <TableRow key={item.tempId}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-14 text-right"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.tempId, "quantity", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-20 text-right"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.tempId, "unitPrice", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-14 text-right"
                        value={item.warrantyMonths}
                        onChange={(e) => updateItem(item.tempId, "warrantyMonths", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant={serialOk ? "outline" : "secondary"}
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => openSerialModal(item.tempId)}
                      >
                        <ScanLine className="size-3" />
                        {serialCount}/{item.quantity}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.tempId)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          Tổng: {totalAmount.toLocaleString("vi-VN")}₫
        </span>
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

      {activeItem && (
        <SerialModal
          open={serialModalOpen}
          onOpenChange={setSerialModalOpen}
          productName={activeItem.productName}
          productSku={activeItem.productSku}
          required={activeItem.quantity}
          serials={activeItem.serials}
          onSave={(serials) => saveSerials(activeItem.tempId, serials)}
        />
      )}
    </div>
  )
}
