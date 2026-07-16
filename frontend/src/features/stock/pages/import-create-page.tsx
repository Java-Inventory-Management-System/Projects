import { useState, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { createImportReceipt } from "@/features/stock/services/import-service"
import { suggestLocation } from "@/features/stock/services/location-service"
import { useCategoryZones } from "@/hooks/use-category-zones"
import { useProducts } from "@/hooks/use-products"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useLocations } from "@/hooks/use-locations"
import type { LocationResponse } from "@/utils/types"
import { importFormSchema } from "@/features/stock/schemas/import-schema"
import type { ImportFormData } from "@/features/stock/schemas/import-schema"
import { toast } from "@/utils/toast"
import { Badge } from "@/components/ui/badge"
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
import { Trash2, Plus, ScanLine, MapPin } from "lucide-react"
import { SerialModal } from "../components/serial-modal"

interface LineItem {
  tempId: number
  productId: number
  productName: string
  productSku: string
  categoryId: number | null
  quantity: number
  unitPrice: number
  warrantyMonths: number
  serials: string[]
  locationId: string
}

export const ImportCreatePage = () => {
  const navigate = useNavigate()
  const [supplierId, setSupplierId] = useState("")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<LineItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [referenceDoc, setReferenceDoc] = useState("")
  const [serialModalOpen, setSerialModalOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<number | null>(null)

  const { data: productsRes } = useProducts(0, 100)
  const { data: suppliers = [] } = useSuppliers()
  const { data: locations = [] } = useLocations()
  const { data: zoneMap = {} } = useCategoryZones()

  const products = useMemo(() => productsRes?.content ?? [], [productsRes])

  const activeItem = items.find((i) => i.tempId === activeItemId)

  const createMut = useMutation({
    mutationFn: createImportReceipt,
    onSuccess: () => { toast.success("Tạo phiếu nhập thành công"); navigate("/stock/imports") },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra khi tạo phiếu nhập"),
  })

  const addItem = useCallback(() => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === Number(selectedProductId))
    if (!product) return
    if (items.some((i) => i.productId === product.id)) {
      toast.error("Sản phẩm này đã có trong phiếu")
      return
    }
    const suggested = suggestLocation(product.categoryId, locations, zoneMap)
    setItems((prev) => [
      ...prev,
      {
        tempId: Date.now(),
        productId: product.id,
        productName: product.name,
        productSku: product.sku ?? "",
        categoryId: product.categoryId,
        quantity: 1,
        unitPrice: 0,
        warrantyMonths: 12,
        serials: [],
        locationId: suggested ? String(suggested.id) : "",
      },
    ])
    setSelectedProductId("")
  }, [selectedProductId, products, items, locations, zoneMap])

  const updateItem = useCallback((tempId: number, field: keyof LineItem, value: number | string) => {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, [field]: value } : i)))
  }, [])

  const removeItem = useCallback((tempId: number) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }, [])

  const openSerialModal = useCallback((tempId: number) => {
    setActiveItemId(tempId)
    setSerialModalOpen(true)
  }, [])

  const saveSerials = useCallback((tempId: number, newSerials: string[]) => {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, serials: newSerials } : i)))
  }, [])

  const groupedLocations = useMemo(() => {
    const groups: Record<string, LocationResponse[]> = {}
    for (const loc of locations) {
      if (!groups[loc.zoneCode]) groups[loc.zoneCode] = []
      groups[loc.zoneCode].push(loc)
    }
    return groups
  }, [locations])

  const totalAmount = useMemo(() => items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [items])

  const serialIssues = useMemo(() => items
    .map((i) => {
      if (i.serials.length < i.quantity) return { name: i.productName, issue: `thiếu ${i.quantity - i.serials.length} serial` }
      if (i.serials.length > i.quantity) return { name: i.productName, issue: `thừa ${i.serials.length - i.quantity} serial` }
      return null
    })
    .filter(Boolean) as { name: string; issue: string }[], [items])

  const allSerialsOk = serialIssues.length === 0
  const locationIssues = items.filter((i) => !i.locationId)
  const allLocationsOk = locationIssues.length === 0

  const handleSubmit = useCallback(() => {
    const raw: ImportFormData = { supplierId, receiptDate, referenceDoc, note, items }
    const parsed = importFormSchema.safeParse(raw)
    if (!parsed.success) {
      const first = parsed.error.errors[0]
      toast.error(first.message)
      return
    }
    if (!allSerialsOk) {
      toast.error(serialIssues.map((s) => `${s.name}: ${s.issue}`).join("\n"))
      return
    }
    if (!allLocationsOk) {
      toast.error("Vui lòng chọn vị trí kho cho tất cả sản phẩm")
      return
    }
    createMut.mutate({
      receiptCode: referenceDoc || undefined,
      supplierId: Number(supplierId),
      note: note || null,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        warrantyMonths: i.warrantyMonths,
        serialNumbers: i.serials.length > 0 ? i.serials : undefined,
        locationId: i.locationId ? Number(i.locationId) : undefined,
      })),
    })
  }, [supplierId, receiptDate, referenceDoc, note, items, allSerialsOk, serialIssues, allLocationsOk, createMut])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/imports")}>
          &larr; Quay lại
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu nhập kho</h1>
        <Badge variant="outline" className="text-xs font-normal ml-auto">
          <MapPin className="size-3 mr-1" />
          Vị trí gợi ý &mdash; cần QL xác nhận thực tế
        </Badge>
      </div>

      <div className="space-y-2 max-w-sm">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="receiptDate">Ngày nhập</Label>
          <Input id="receiptDate" type="date" required value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceDoc">Số hóa đơn/chứng từ tham khảo</Label>
          <Input id="referenceDoc" placeholder="Không bắt buộc" value={referenceDoc} onChange={(e) => setReferenceDoc(e.target.value)} />
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
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Sản phẩm</TableHead>
                <TableHead className="w-16 text-right">SL</TableHead>
                <TableHead className="w-24 text-right">Đơn giá</TableHead>
                <TableHead className="w-14 text-right">BH</TableHead>
                <TableHead className="w-28 text-right">Thành tiền</TableHead>
                <TableHead className="w-40">Vị trí</TableHead>
                <TableHead className="w-28 text-center">Serial</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const serialCount = item.serials.length
                const serialOk = serialCount === item.quantity
                const suggested = suggestLocation(item.categoryId, locations, zoneMap)
                return (
                  <TableRow key={item.tempId}>
                    <TableCell className="font-medium text-sm">{item.productName}</TableCell>
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
                    <TableCell className="text-right tabular-nums text-sm">
                      {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.locationId}
                        onValueChange={(v) => updateItem(item.tempId, "locationId", v)}
                      >
                        <SelectTrigger className={`h-8 text-xs ${!item.locationId ? "text-muted-foreground" : ""}`}>
                          <SelectValue placeholder="Chọn vị trí..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedLocations).map(([zone, locs]) => (
                            <div key={zone}>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                Khu {zone}
                              </div>
                              {locs.map((loc) => (
                                <SelectItem key={loc.id} value={String(loc.id)} className="text-xs pl-4">
                                  {loc.fullCode}
                                  {suggested?.id === loc.id ? " (gợi ý)" : ""}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
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
        <p className="text-xs text-muted-foreground italic">
          Tổng serial cần nhập: {items.reduce((s, i) => s + i.quantity, 0)} &middot; Đã nhập: {items.reduce((s, i) => s + i.serials.length, 0)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea id="note" placeholder="Ghi chú (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
        <MapPin className="size-3 inline mr-1" />
        <strong>Vị trí gợi ý dựa trên danh mục sản phẩm.</strong> Kho thực tế có thể khác &mdash; cần Quản lý kho xác nhận khi duyệt phiếu.&ensp;
        <Badge variant="outline" className="text-[10px]">Mock: chưa có backend</Badge>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/imports")}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          disabled={!supplierId || items.length === 0 || createMut.isPending}
        >
          {createMut.isPending ? "Đang tạo..." : "Tạo phiếu nhập"}
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
