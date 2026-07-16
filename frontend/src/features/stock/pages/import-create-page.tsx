import { useState, useMemo, useCallback, useEffect } from "react"
import { useNavigate, useBlocker } from "react-router-dom"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Trash2, Plus, ScanLine, MapPin, Check, ChevronsUpDown, Circle, CircleCheckBig } from "lucide-react"
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
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)
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

  const hasUnsaved = items.length > 0

  useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsaved && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!hasUnsaved) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [hasUnsaved])

  const createMut = useMutation({
    mutationFn: createImportReceipt,
    onSuccess: () => { toast.success("Tạo phiếu nhập thành công"); navigate("/stock/imports") },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra khi tạo phiếu nhập"),
  })

  const nextTempId = useMemo(() => {
    let id = Date.now()
    return () => id++
  }, [])

  const addItems = useCallback(() => {
    if (selectedProductIds.length === 0) return
    const existing = new Set(items.map((i) => i.productId))
    const toAdd = products.filter((p) => selectedProductIds.includes(p.id) && !existing.has(p.id))
    if (toAdd.length === 0) {
      toast.error("Tất cả sản phẩm đã có trong phiếu")
      setSelectedProductIds([])
      return
    }
    setItems((prev) => [
      ...prev,
      ...toAdd.map((product) => {
        const suggested = suggestLocation(product.categoryId, locations, zoneMap)
        return {
          tempId: nextTempId(),
          productId: product.id,
          productName: product.name,
          productSku: product.sku ?? "",
          categoryId: product.categoryId,
          quantity: 1,
          unitPrice: 0,
          warrantyMonths: 12,
          serials: [],
          locationId: suggested ? String(suggested.id) : "",
        }
      }),
    ])
    setSelectedProductIds([])
    setProductPopoverOpen(false)
  }, [selectedProductIds, products, items, locations, zoneMap, nextTempId])

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
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu nhập kho        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
          <Label htmlFor="receiptDate">Ngày nhập</Label>
          <Input id="receiptDate" type="date" required value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceDoc">Số hóa đơn/chứng từ</Label>
          <Input id="referenceDoc" placeholder="Không bắt buộc" value={referenceDoc} onChange={(e) => setReferenceDoc(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Thêm sản phẩm</Label>
        <div className="flex gap-2">
          <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="flex-1 justify-between h-10 font-normal"
              >
                {selectedProductIds.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {selectedProductIds.slice(0, 2).map((id) => {
                      const p = products.find((x) => x.id === id)
                      return p ? <Badge key={id} variant="secondary" className="text-xs">{p.name}</Badge> : null
                    })}
                    {selectedProductIds.length > 2 && (
                      <Badge variant="secondary" className="text-xs">+{selectedProductIds.length - 2}</Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Chọn sản phẩm...</span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Tìm sản phẩm..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy sản phẩm</CommandEmpty>
                  <CommandGroup>
                    {products.map((p) => {
                      const alreadyAdded = items.some((i) => i.productId === p.id)
                      const isSelected = selectedProductIds.includes(p.id)
                      return (
                        <CommandItem
                          key={p.id}
                          disabled={alreadyAdded}
                          onSelect={() => {
                            if (alreadyAdded) return
                            setSelectedProductIds((prev) =>
                              isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            )
                          }}
                          className={alreadyAdded ? "opacity-50" : ""}
                        >
                          <div className={`size-4 rounded border flex items-center justify-center mr-2 ${
                            isSelected ? "bg-primary border-primary" : "border-input"
                          }`}>
                            {isSelected && <Check className="size-3 text-primary-foreground" />}
                          </div>
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{p.sku}</span>
                          {alreadyAdded && <span className="text-xs text-muted-foreground ml-auto">Đã thêm</span>}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button onClick={addItems} disabled={selectedProductIds.length === 0}>
            <Plus className="size-4 mr-1" /> Thêm{selectedProductIds.length > 0 ? ` (${selectedProductIds.length})` : ""}
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Sản phẩm</TableHead>
                <TableHead className="w-20 text-right">SL</TableHead>
                <TableHead className="w-28 text-right">Đơn giá</TableHead>
                <TableHead className="w-16 text-right">BH(th)</TableHead>
                <TableHead className="w-28 text-right">Thành tiền</TableHead>
                <TableHead className="w-44">Vị trí</TableHead>
                <TableHead className="w-28 text-center">Serial</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const serialCount = item.serials.length
                const serialOk = serialCount === item.quantity
                const hasLocation = !!item.locationId
                const rowOk = serialOk && hasLocation
                const suggested = suggestLocation(item.categoryId, locations, zoneMap)
                return (
                  <TableRow key={item.tempId}>
                    <TableCell className="font-medium text-sm truncate max-w-[200px]" title={item.productName}>
                      <span className="inline-flex items-center gap-1.5">
                        {rowOk ? (
                          <CircleCheckBig className="size-4 shrink-0 text-green-600" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        {item.productName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        className="h-9 w-16 text-right"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.tempId, "quantity", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="h-9 w-24 text-right"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.tempId, "unitPrice", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="h-9 w-16 text-right"
                        value={item.warrantyMonths}
                        onChange={(e) => updateItem(item.tempId, "warrantyMonths", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.locationId}
                        onValueChange={(v) => updateItem(item.tempId, "locationId", v)}
                      >
                        <SelectTrigger className={`h-9 text-xs ${!item.locationId ? "text-muted-foreground" : ""}`}>
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
                        className="gap-1 text-xs h-9"
                        onClick={() => openSerialModal(item.tempId)}
                      >
                        <ScanLine className="size-3.5" />
                        {serialCount}/{item.quantity}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(item.tempId)}>
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

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <MapPin className="size-4 shrink-0 mt-0.5" />
        <span>
          <strong>Vị trí gợi ý theo danh mục.</strong> Kho thực tế có thể khác &mdash; cần QL kho xác nhận khi duyệt.
        </span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/imports")}>Hủy</Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                onClick={handleSubmit}
                disabled={!supplierId || items.length === 0 || createMut.isPending}
              >
                {createMut.isPending ? "Đang tạo..." : "Tạo phiếu nhập"}
              </Button>
            </span>
          </TooltipTrigger>
          {(!supplierId || items.length === 0) && (
            <TooltipContent side="top" className="text-xs">
              {!supplierId && <p>● Chưa chọn nhà cung cấp</p>}
              {items.length === 0 && <p>● Chưa có sản phẩm</p>}
            </TooltipContent>
          )}
        </Tooltip>
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
