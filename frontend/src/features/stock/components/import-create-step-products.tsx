import { useState, useMemo } from "react"
import type { LineItem } from "@/utils/types"
import type { ProductResponse, LocationResponse } from "@/utils/types"
import type { ItemAction } from "../reducers/import-create-reducer"
import { suggestLocation } from "@/utils/suggest-location"
import { toast } from "@/utils/toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { LocationPicker } from "@/features/stock/components/location-picker"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Trash2, Plus, MapPin, Check, ChevronsUpDown, Circle, CircleCheckBig } from "lucide-react"

interface Props {
  items: LineItem[]
  dispatch: React.Dispatch<ItemAction>
  products: ProductResponse[]
  locations: LocationResponse[]
  zoneMap: Record<number, string>
  isManager: boolean
}

export function ImportStepProducts({ items, dispatch, products, locations, zoneMap, isManager }: Props) {
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)
  const [locationPickerItem, setLocationPickerItem] = useState<number | null>(null)

  const nextTempId = useMemo(() => {
    let id = Date.now()
    return () => id++
  }, [])

  function addItems() {
    if (selectedProductIds.length === 0) return
    const existing = new Set(items.map((i) => i.productId))
    const toAdd = products.filter((p) => selectedProductIds.includes(p.id) && !existing.has(p.id))
    if (toAdd.length === 0) {
      toast.error("Tất cả sản phẩm đã có trong phiếu")
      setSelectedProductIds([])
      return
    }
    dispatch({
      type: "ADD_ITEMS",
      payload: toAdd.map((product) => {
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
    })
    setSelectedProductIds([])
    setProductPopoverOpen(false)
  }

  function updateItem(tempId: number, field: keyof LineItem, value: string | number) {
    dispatch({ type: "UPDATE_ITEM", tempId, field, value })
  }

  function removeItem(tempId: number) {
    dispatch({ type: "REMOVE_ITEM", tempId })
  }

  function foundLocation(item: LineItem) {
    return locations.find((l) => l.id === Number(item.locationId))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">Bước 2/4 — Chọn sản phẩm & số lượng</h2>

      <div className="space-y-2">
        <Label>Thêm sản phẩm</Label>
        <div className="flex gap-2">
          <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="flex-1 justify-between h-10 font-normal">
                {selectedProductIds.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {selectedProductIds.slice(0, 2).map((id) => {
                      const p = products.find((x) => x.id === id)
                      return p ? (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {p.name}
                        </Badge>
                      ) : null
                    })}
                    {selectedProductIds.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedProductIds.length - 2}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Chọn sản phẩm...</span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[90vw] max-w-[400px] p-0" align="start">
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
                              isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                            )
                          }}
                          className={alreadyAdded ? "opacity-50" : ""}
                        >
                          <div
                            className={`size-4 rounded border flex items-center justify-center mr-2 ${
                              isSelected ? "bg-primary border-primary" : "border-input"
                            }`}
                          >
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
            <Plus className="size-4 mr-1" /> Thêm
            {selectedProductIds.length > 0 ? ` (${selectedProductIds.length})` : ""}
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
                {isManager && <TableHead className="w-28 text-right">Đơn giá</TableHead>}
                {isManager && <TableHead className="w-16 text-right">BH(th)</TableHead>}
                {isManager && <TableHead className="w-28 text-right">Thành tiền</TableHead>}
                <TableHead className="w-44">Vị trí</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const loc = foundLocation(item)
                const suggested = suggestLocation(item.categoryId, locations, zoneMap)
                return (
                  <TableRow key={item.tempId}>
                    <TableCell className="font-medium text-sm truncate max-w-[200px]" title={item.productName}>
                      <span className="inline-flex items-center gap-1.5">
                        {item.locationId ? (
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
                    {isManager && (
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-24 text-right"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.tempId, "unitPrice", Number(e.target.value))}
                        />
                      </TableCell>
                    )}
                    {isManager && (
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-16 text-right"
                          value={item.warrantyMonths}
                          onChange={(e) => updateItem(item.tempId, "warrantyMonths", Number(e.target.value))}
                        />
                      </TableCell>
                    )}
                    {isManager && (
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫
                      </TableCell>
                    )}
                    <TableCell>
                      {loc ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs font-mono gap-1">
                            <MapPin className="size-3" />
                            {loc.fullCode}
                          </Badge>
                          <Sheet
                            open={locationPickerItem === item.tempId}
                            onOpenChange={(v) => {
                              if (!v) setLocationPickerItem(null)
                            }}
                          >
                            <SheetTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-1"
                                onClick={() => setLocationPickerItem(item.tempId)}
                              >
                                Đổi
                              </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[85vw] sm:w-[320px]">
                              <SheetHeader>
                                <SheetTitle className="text-sm">Chọn vị trí — {item.productName}</SheetTitle>
                              </SheetHeader>
                              <div className="mt-4">
                                <LocationPicker
                                  value={item.locationId}
                                  onSelect={(v) => {
                                    updateItem(item.tempId, "locationId", v)
                                    setLocationPickerItem(null)
                                  }}
                                  suggestedLocationId={suggested?.id}
                                />
                              </div>
                            </SheetContent>
                          </Sheet>
                        </div>
                      ) : (
                        <LocationPicker
                          value={item.locationId}
                          onSelect={(v) => updateItem(item.tempId, "locationId", v)}
                          suggestedLocationId={suggested?.id}
                        />
                      )}
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

      <div className="flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <MapPin className="size-4 shrink-0 mt-0.5" />
        <span>
          <strong>Vị trí gợi ý theo danh mục.</strong> Kho thực tế có thể khác — cần QL kho xác nhận khi duyệt.
        </span>
      </div>
    </div>
  )
}
