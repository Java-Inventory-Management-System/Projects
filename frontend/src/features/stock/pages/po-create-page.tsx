import { useState, useMemo, useCallback, useRef } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useNavigate, useBlocker } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useCreatePurchaseOrder } from "@/hooks/use-purchase-orders"
import { useProducts } from "@/hooks/use-products"
import { useSuppliers } from "@/hooks/use-suppliers"
import { toLocalDateStr } from "@/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog"
import { ImportCreateSidebar } from "../components/import-create-sidebar"
import { Trash2, Plus, ChevronsUpDown } from "lucide-react"
import { toast } from "@/utils/toast"
import { Empty, EmptyTitle } from "@/components/ui/empty"

interface POFormFields {
  supplierId: string
  invoiceCode: string
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const navigatingAfterMut = useRef(false)
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)

  const { data: productsRes } = useProducts(0, 1000)
  const { data: suppliers = [] } = useSuppliers()
  const products = useMemo(() => (productsRes?.content ?? []).filter((p) => p.isActive), [productsRes])

  const defaultDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return toLocalDateStr(d)
  }, [])

  const form = useForm<POFormFields>({
    defaultValues: { supplierId: "", invoiceCode: "", note: "", expectedDate: defaultDate, items: [] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
  const watchedSupplierId = form.watch("supplierId")
  const supplierIdNum = watchedSupplierId ? Number(watchedSupplierId) : null
  const pickerProducts = useMemo(
    () => (supplierIdNum != null ? products.filter((p) => p.supplierIds?.includes(supplierIdNum)) : []),
    [products, supplierIdNum],
  )

  const createMut = useCreatePurchaseOrder()

  const hasUnsaved = fields.length > 0
  const blocker = useBlocker(
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
    const toAdd = pickerProducts.filter((p) => selectedProductIds.includes(p.id) && !existing.has(p.id))
    if (toAdd.length === 0) {
      toast.error(t("poCreate.allProductsAdded"))
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
  }, [selectedProductIds, pickerProducts, fields, append, nextTempId, t])

  const onSubmit = form.handleSubmit((values) => {
    const invalidItem = values.items.find((i) => !i.quantity || i.quantity <= 0)
    if (invalidItem) {
      toast.error(t("poCreate.invalidItem"))
      return
    }
    if (values.items.some((i) => !i.unitPrice || i.unitPrice < 0)) {
      toast.error(t("poCreate.invalidPrice"))
      return
    }
    createMut.mutate(
      {
        supplierId: Number(values.supplierId),
        invoiceCode: values.invoiceCode.trim() || null,
        expectedDate: values.expectedDate,
        note: values.note || null,
        items: values.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      },
      {
        onSuccess: () => {
          navigatingAfterMut.current = true
          toast.success(t("poCreate.createSuccess"))
          navigate("/stock/purchase-orders")
        },
        onError: (e: Error) => {
          toast.error(e.message || t("poCreate.createError"))
        },
      },
    )
  })

  return (
    <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="lg:col-span-2 space-y-4 self-start">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/stock/purchase-orders")}>
            &larr; {t("common.back")}
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{t("poCreate.title")}</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplier">
              {t("poCreate.supplier")} <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="supplierId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectedProductIds([]) }}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder={t("poCreate.supplierPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.filter((s) => s.isActive).map((s) => (
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
            <Label htmlFor="expectedDate">{t("poCreate.expectedDate")}</Label>
            <Input id="expectedDate" type="date" {...form.register("expectedDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceCode">{t("poCreate.invoiceCode")}</Label>
            <Input
              id="invoiceCode"
              placeholder={t("poCreate.invoiceCodePlaceholder")}
              {...form.register("invoiceCode")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("poCreate.products")}</Label>
          <div className="flex gap-2">
            <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productPopoverOpen}
                  className="flex-1 justify-between"
                >
                  {selectedProductIds.length > 0 ? t("poCreate.selectedProducts", { count: selectedProductIds.length }) : t("poCreate.searchProduct")}
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[90vw] max-w-[400px] p-0">
                <Command>
                  <CommandInput placeholder={t("poCreate.searchPlaceholder")} />
                  <CommandList>
                    <CommandEmpty>
                      {supplierIdNum == null
                        ? t("poCreate.selectSupplierFirst")
                        : pickerProducts.length === 0
                          ? t("poCreate.noProductsForSupplier")
                          : t("poCreate.noResults")}
                    </CommandEmpty>
                    <CommandGroup>
                      {pickerProducts
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
              <Plus className="size-4 mr-1" /> {t("poCreate.add")}
            </Button>
          </div>
          {!watchedSupplierId && (
            <p className="text-sm text-muted-foreground">{t("poCreate.selectSupplierFirst")}</p>
          )}
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead className="w-24 text-right">{t("table.qty")}</TableHead>
                <TableHead className="w-32 text-right">{t("table.unitPrice")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Empty>
                      <EmptyTitle>{t("poCreate.noProducts")}</EmptyTitle>
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
                        className="h-8 w-28 text-right"
                        {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      />
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

        <div className="space-y-2">
          <Label htmlFor="note">{t("poCreate.note")}</Label>
          <Textarea id="note" placeholder={t("poCreate.notePlaceholder")} rows={2} {...form.register("note")} />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate("/stock/purchase-orders")}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!watchedSupplierId || fields.length === 0 || createMut.isPending}>
            {createMut.isPending ? t("poCreate.creating") : t("poCreate.submit")}
          </Button>
        </div>
      </div>

      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
        onStay={() => blocker.state === "blocked" && blocker.reset()}
        onLeave={() => blocker.state === "blocked" && blocker.proceed()}
      />

      <div className="lg:col-span-1">
        <ImportCreateSidebar />
      </div>
    </div>
  )
}
