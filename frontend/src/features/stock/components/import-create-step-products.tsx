import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { LineItem } from "@/utils/types"
import type { ProductResponse } from "@/utils/types"
import type { ItemAction } from "../reducers/import-create-reducer"
import { toast } from "@/utils/toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Check, ChevronsUpDown } from "lucide-react"

interface Props {
  items: LineItem[]
  dispatch: React.Dispatch<ItemAction>
  products: ProductResponse[]
  isManager: boolean
}

export function ImportStepProducts({ items, dispatch, products, isManager }: Props) {
  const { t } = useTranslation()
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)

  const nextTempId = useMemo(() => {
    let id = Date.now()
    return () => id++
  }, [])

  function addItems() {
    if (selectedProductIds.length === 0) return
    const existing = new Set(items.map((i) => i.productId))
    const toAdd = products.filter((p) => selectedProductIds.includes(p.id) && !existing.has(p.id))
    if (toAdd.length === 0) {
      toast.error(t("importStepProducts.allProductsAdded"))
      setSelectedProductIds([])
      return
    }
    dispatch({
      type: "ADD_ITEMS",
      payload: toAdd.map((product) => ({
        tempId: nextTempId(),
        productId: product.id,
        productName: product.name,
        productSku: product.sku ?? "",
        categoryId: product.categoryId,
        quantity: 1,
        unitPrice: 0,
        warrantyMonths: 12,
        serials: [],
        locationId: "",
        itemStatus: "NORMAL",
        notReceivedReason: "",
      })),
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

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{t("importStepProducts.heading")}</h2>

      <div className="space-y-2">
        <Label>{t("importStepProducts.addProduct")}</Label>
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
                  <span className="text-muted-foreground">{t("importStepProducts.selectProduct")}</span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[90vw] max-w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("importStepProducts.searchProduct")} />
                <CommandList>
                  <CommandEmpty>{t("importStepProducts.noProductFound")}</CommandEmpty>
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
                          {alreadyAdded && <span className="text-xs text-muted-foreground ml-auto">{t("importStepProducts.alreadyAdded")}</span>}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button onClick={addItems} disabled={selectedProductIds.length === 0}>
            <Plus className="size-4 mr-1" /> {t("common.add")}
            {selectedProductIds.length > 0 ? ` (${selectedProductIds.length})` : ""}
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">{t("importStepProducts.product")}</TableHead>
                <TableHead className="w-20 text-right">{t("importStepProducts.qty")}</TableHead>
                {isManager && <TableHead className="w-28 text-right">{t("importStepProducts.unitPrice")}</TableHead>}
                {isManager && <TableHead className="w-16 text-right">{t("importStepProducts.warranty")}</TableHead>}
                {isManager && <TableHead className="w-28 text-right">{t("importStepProducts.total")}</TableHead>}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                  <TableRow key={item.tempId}>
                    <TableCell className="font-medium text-sm truncate max-w-[200px]" title={item.productName}>
                      <span className="inline-flex items-center gap-1.5">{item.productName}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        className="h-9 w-16 text-right"
                        value={item.quantity}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          updateItem(item.tempId, "quantity", !Number.isFinite(v) || v < 1 ? 1 : v)
                        }}
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
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(item.tempId)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
