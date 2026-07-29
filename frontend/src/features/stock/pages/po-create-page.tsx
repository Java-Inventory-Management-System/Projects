import { useState, useMemo, useCallback, useRef } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useNavigate, useBlocker } from "react-router-dom"
import { useCreatePurchaseOrder } from "@/hooks/use-purchase-orders"
import { useProducts } from "@/hooks/use-products"
import { useSuppliers } from "@/hooks/use-suppliers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ImportCreateSidebar } from "../components/import-create-sidebar"
import { Trash2, Plus, ChevronsUpDown } from "lucide-react"
import { toast } from "@/utils/toast"
import { Empty, EmptyTitle } from "@/components/ui/empty"

interface POFormFields {
  supplierId: string
  note: string
  expectedDate: string
  items: {
    tempId: number
    productId: number
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
  }[]
}

export function POCreatePage() {
  const navigate = useNavigate()
  const navigatingAfterMut = useRef(false)
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)

  const { data: productsRes } = useProducts(0, 100)
  const { data: suppliers = [] } = useSuppliers()
  const products = useMemo(() => productsRes?.content ?? [], [productsRes])

  const defaultDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  }, [])

  const form = useForm<POFormFields>({
    defaultValues: { supplierId: "", note: "", expectedDate: defaultDate, items: [] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
  const watchedSupplierId = form.watch("supplierId")

  const createMut = useCreatePurchaseOrder()

  const hasUnsaved = fields.length > 0
  useBlocker(
    ({ currentLocation, nextLocation }) =>
      !navigatingAfterMut.current && hasUnsaved && currentLocation.pathname !== nextLocation.pathname,
  )

  const nextTempId = useMemo(() => {
    let id = Date.now()
    return () => id++
  }, [])

  const addItems = useCallback(() => {
    if (selectedProductIds.length === 0) return
    const existing = new Set(fields.map((f) => f.productId))
    const toAdd = products.filter((p) => selectedProductIds.includes(p.id) && !existing.has(p.id))
    if (toAdd.length === 0) {
      toast.error("Tất cả sản phẩm đã có")
      setSelectedProductIds([])
      return
    }
    append(toAdd.map((p) => ({
      tempId: nextTempId(),
      productId: p.id,
      productName: p.name,
      productSku: p.sku ?? "",
      quantity: 1,
      unitPrice: 0,
    })))
    setSelectedProductIds([])
    setProductPopoverOpen(false)
  }, [selectedProductIds, products, fields, append, nextTempId])

  const totalAmount = useMemo(() => fields.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [fields])

  const onSubmit = form.handleSubmit((values) => {
    createMut.mutate(
      {
        supplierId: Number(values.supplierId),
        expectedDate: values.expectedDate,
        note: values.note || null,
        items: values.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      },
      {
        onSuccess: () => {
          navigatingAfterMut.current = true
          toast.success("Tạo đơn hàng thành công")
          navigate("/stock/purchase-orders")
        },
        onError: (e: Error) => {
          toast.error(e.message || "Không thể tạo đơn hàng")
        },
      },
    )
  })

  return (
    <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="lg:col-span-2 space-y-4 self-start">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/stock/purchase-orders")}>
            &larr; Quay lại
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">Tạo đơn đặt hàng</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplier">
              Nhà cung cấp <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="supplierId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Chọn NCC" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedDate">Ngày giao dự kiến</Label>
            <Input id="expectedDate" type="date" {...form.register("expectedDate")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sản phẩm</Label>
          <div className="flex gap-2">
            <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productPopoverOpen}
                  className="flex-1 justify-between"
                >
                  {selectedProductIds.length > 0 ? `Đã chọn ${selectedProductIds.length} SP` : "Tìm sản phẩm..."}
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[90vw] max-w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Tìm theo tên hoặc SKU..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy</CommandEmpty>
                    <CommandGroup>
                      {products
                        .filter((p) => !fields.find((i) => i.productId === p.id))
                        .map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${p.sku ?? ""}`}
                            onSelect={() => {
                              setSelectedProductIds((prev) =>
                                prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                              )
                            }}
                          >
                            <div
                              className={`mr-2 size-4 rounded-sm border ${selectedProductIds.includes(p.id) ? "bg-primary border-primary" : ""}`}
                            />
                            <span className="flex-1 truncate">{p.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button onClick={addItems} disabled={selectedProductIds.length === 0}>
              <Plus className="size-4 mr-1" /> Thêm
            </Button>
          </div>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="w-24 text-right">SL</TableHead>
                <TableHead className="w-28 text-right">Đơn giá</TableHead>
                <TableHead className="w-28 text-right">Thành tiền</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Empty>
                      <EmptyTitle>Chưa có sản phẩm</EmptyTitle>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-xs text-muted-foreground ml-1">{item.productSku}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-20 text-right"
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-24 text-right"
                        {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <span className="text-lg font-semibold">Tổng: {totalAmount.toLocaleString("vi-VN")}₫</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Ghi chú</Label>
          <Textarea id="note" placeholder="Ghi chú cho NCC..." rows={2} {...form.register("note")} />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate("/stock/purchase-orders")}>
            Hủy
          </Button>
          <Button onClick={onSubmit} disabled={!watchedSupplierId || fields.length === 0 || createMut.isPending}>
            {createMut.isPending ? "Đang tạo..." : "Tạo đơn hàng"}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-1">
        <ImportCreateSidebar />
      </div>
    </div>
  )
}
