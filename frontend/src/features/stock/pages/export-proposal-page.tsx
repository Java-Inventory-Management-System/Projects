import { useState, useEffect, useMemo } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createExportReceipt } from "@/services/export-service"
import { getQcUnits } from "@/services/qc-processing-service"
import { useProducts } from "@/hooks/use-products"
import { useInventory } from "@/hooks/use-inventory"
import { getSuppliers } from "@/services/supplier-service"
import { CustomerSelectModal } from "@/features/stock/components/customer-select-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Search, X } from "lucide-react"
import { useFormDraft, clearDraft } from "@/hooks/use-form-draft"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/utils/toast"
import { EXPORT_REASON, PRODUCT_UNIT_STATUS } from "@/utils/types"
import type { ExportReason } from "@/utils/types"

interface ProposalFormFields {
  type: ExportReason | ""
  customerId: string
  customReason: string
  externalReference: string
  items: {
    tempId: number
    productId: number
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
  }[]
}

export const ExportProposalPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reasons: { value: ExportReason; label: string }[] = [
    { value: EXPORT_REASON.SALE, label: t("exportReason.sale") },
    { value: EXPORT_REASON.INTERNAL, label: t("exportReason.internal") },
    { value: EXPORT_REASON.RETURN_SUPPLIER, label: t("exportReason.returnSupplier") },
    { value: EXPORT_REASON.DISPOSE, label: t("exportReason.dispose") },
    { value: EXPORT_REASON.WARRANTY_REPLACEMENT, label: t("exportReason.warrantyReplacement") },
    { value: EXPORT_REASON.OTHER, label: t("exportReason.other") },
  ]
  const qc = useQueryClient()
  const [customerName, setCustomerName] = useState("")
  const [selectModalOpen, setSelectModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [showDraftDialog, setShowDraftDialog] = useState(false)

  const { data: productsRes } = useProducts(0, 100)
  const products = useMemo(() => (productsRes?.content ?? []).filter((p) => p.isActive), [productsRes])
  const { data: invRes } = useInventory(0, 500)
  const invMap = useMemo(() => {
    const m = new Map<number, number>()
    invRes?.content?.forEach((i: { productId: number; quantity: number }) => m.set(i.productId, i.quantity))
    return m
  }, [invRes])

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  })
  const supplierNameMap = useMemo(() => {
    const m = new Map<number, string>()
    suppliers?.forEach((s) => m.set(s.id, s.name))
    return m
  }, [suppliers])

  const supplierIdFor = (productId: number) =>
    products.find((p) => p.id === productId)?.supplierIds?.[0] ?? undefined
  const commonSupplierId = (items: ProposalFormFields["items"]) => {
    const ids = items.map((i) => supplierIdFor(i.productId)).filter((x): x is number => x != null)
    return ids.length === items.length && ids.length > 0 && new Set(ids).size === 1 ? ids[0] : null
  }

  const { data: waitingRmaUnits } = useQuery({
    queryKey: ["qc-processing", PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT],
    queryFn: () => getQcUnits([PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT]),
  })
  const warrantyAvailMap = useMemo(() => {
    const m = new Map<number, number>()
    waitingRmaUnits?.forEach((u) => {
      const qty = Number(u.remainingQuantity ?? u.initialQuantity ?? 0)
      m.set(u.productId, (m.get(u.productId) ?? 0) + qty)
    })
    return m
  }, [waitingRmaUnits])

  const form = useForm<ProposalFormFields>({
    defaultValues: { type: "", customerId: "", customReason: "", externalReference: "", items: [] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })

  const formValues = form.watch()
  const draftState = useMemo(
    () => ({ type: formValues.type, customerId: formValues.customerId, customerName, customReason: formValues.customReason, externalReference: formValues.externalReference, items: formValues.items }),
    [formValues, customerName],
  )
  const isDirty = fields.length > 0
  const { draftAvailable, restore, dismiss } = useFormDraft(
    "/stock/exports/new",
    draftState as unknown as Record<string, unknown>,
    isDirty,
    (data) => {
      const d = data as typeof draftState
      form.reset({
        type: d.type ?? "",
        customerId: d.customerId ?? "",
        customReason: d.customReason ?? "",
        externalReference: d.externalReference ?? "",
        items: d.items ?? [],
      })
      setCustomerName(d.customerName ?? "")
    },
  )
  useEffect(() => {
    if (draftAvailable) setShowDraftDialog(true)
  }, [draftAvailable])

  const createMut = useMutation({
    mutationFn: createExportReceipt,
    onSuccess: () => {
      clearDraft("/stock/exports/new")
      qc.invalidateQueries({ queryKey: ["export-receipts"] })
      toast.success(t("exportProposal.createSuccess"))
      navigate("/stock/exports")
    },
    onError: (err: Error) => toast.error(err.message || t("exportProposal.createError")),
  })

  const addItem = () => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === Number(selectedProductId))
    if (!product) return
    const avail = availFor(product.id)
    append({
      tempId: Date.now(),
      productId: product.id,
      productName: product.name,
      productSku: product.sku ?? "",
      quantity: avail > 0 ? 1 : 0,
      unitPrice: product.sellPrice ?? 0,
    })
    setSelectedProductId("")
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!values.type) { toast.error(t("exportProposal.reasonRequired")); return }
    if (values.items.length === 0) { toast.error(t("exportProposal.noItems")); return }
    const isOther = values.type === EXPORT_REASON.OTHER
    if (isOther && !values.customReason.trim()) { toast.error(t("exportProposal.otherReasonRequired")); return }
    if (values.type === EXPORT_REASON.SALE && !values.customerId) { toast.error(t("exportProposal.customerRequired")); return }
    const needsSupplier = values.type === EXPORT_REASON.RETURN_SUPPLIER || values.type === EXPORT_REASON.WARRANTY_REPLACEMENT
    const supplierId = needsSupplier ? commonSupplierId(values.items) : null
    if (needsSupplier) {
      if (supplierId == null) {
        toast.error(t("exportProposal.supplierMismatch"))
        return
      }
      if (!supplierNameMap.has(supplierId)) {
        toast.error(t("exportProposal.noSupplier"))
        return
      }
    }
    for (const item of values.items) {
      const avail = availFor(item.productId)
      if (item.quantity > avail) {
        toast.error(t("exportProposal.insufficientStock", { product: item.productName, available: avail, requested: item.quantity }))
        return
      }
    }
    const type = values.type as ExportReason
    createMut.mutate({
      type,
      reason: isOther ? values.customReason.trim() : type,
      customerId: values.customerId ? Number(values.customerId) : null,
      supplierId,
      externalReference: values.externalReference || null,
      items: values.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    })
  })

  const watchedType = form.watch("type")
  const watchedCustomerId = form.watch("customerId")

  const availFor = (productId: number) =>
    watchedType === EXPORT_REASON.WARRANTY_REPLACEMENT
      ? warrantyAvailMap.get(productId) ?? 0
      : invMap.get(productId) ?? 0

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/exports")}>
          &larr; {t("common.back")}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("exportProposal.title")}</h1>
      </div>

      <div className="rounded-lg border p-4">
        <div className="space-y-2">
          <Label htmlFor="reason">{t("exportProposal.chooseReason")}</Label>
          {watchedType === EXPORT_REASON.OTHER ? (
            <div className="flex gap-2">
              <Input id="reason" placeholder={t("exportProposal.otherReasonPlaceholder")} {...form.register("customReason")} />
              <Button variant="outline" size="icon" onClick={() => form.setValue("type", "")} title={t("common.clear")}>
                <X className="size-4" />
              </Button>
            </div>
          ) : (
          <Select value={watchedType ?? ""} onValueChange={(v) => form.setValue("type", v)}>
            <SelectTrigger id="reason">
              <SelectValue placeholder={t("exportProposal.reasonPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
        </div>
      </div>

      {watchedType && (
      <>
      <div className="grid gap-4 sm:grid-cols-2">
        {watchedType === EXPORT_REASON.WARRANTY_REPLACEMENT && (
          <div className="space-y-2">
            <Label htmlFor="externalReference">{t("exportProposal.warrantyCode")}</Label>
            <Input id="externalReference" placeholder={t("exportProposal.warrantyPlaceholder")} {...form.register("externalReference")} />
          </div>
        )}
        {watchedType === EXPORT_REASON.SALE && (
        <div className="space-y-2">
          <Label htmlFor="customer">{t("exportProposal.customer")}</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-start font-normal h-10"
              onClick={() => setSelectModalOpen(true)}
            >
              {watchedCustomerId ? (
                <span className="truncate">{customerName}</span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-2">
                  <Search className="size-4" />
                  {t("exportProposal.searchCustomer")}
                </span>
              )}
            </Button>
            {watchedCustomerId && (
              <Button variant="ghost" size="icon" onClick={() => { form.setValue("customerId", ""); setCustomerName("") }}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("exportProposal.addProductLabel")}</Label>
        <div className="flex gap-2">
          <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal h-10">
                {selectedProductId ? (
                  <span className="truncate">
                    {products.find((p) => p.id === Number(selectedProductId))?.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("exportProposal.selectProductPlaceholder")}</span>
                )}
                <Search className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder={t("exportProposal.searchProduct")} className="h-9" />
                <CommandList>
                  <CommandEmpty>{t("exportProposal.noProducts")}</CommandEmpty>
                  <CommandGroup>
                    {products.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.sku ?? ""}`}
                        onSelect={() => {
                          setSelectedProductId(String(p.id))
                          setProductPickerOpen(false)
                        }}
                      >
                        {p.name} ({p.sku}) &mdash; {p.sellPrice?.toLocaleString("vi-VN")}d &mdash;{" "}
                        {t("exportProposal.inStock", { count: availFor(p.id) })}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button onClick={addItem} disabled={!selectedProductId}>
            <Plus className="size-4 mr-1" /> {t("common.add")}
          </Button>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead className="w-20 text-right">{t("table.qty")}</TableHead>
                <TableHead className="w-28 text-right">{t("table.unitPrice")}</TableHead>
                <TableHead className="w-28 text-right">{t("table.total")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>
                    <Input type="number" min={1} max={availFor(item.productId)} className="h-8 w-16 text-right"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      onBlur={(e) => {
                        const max = availFor(item.productId)
                        const val = Number(e.target.value)
                        if (val > max) {
                          form.setValue(`items.${index}.quantity`, max)
                          toast.warning(t("exportProposal.maxQuantity", { max }))
                        }
                      }} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} className="h-8 w-24 text-right" readOnly
                      {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })} />
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(watchedType === EXPORT_REASON.RETURN_SUPPLIER || watchedType === EXPORT_REASON.WARRANTY_REPLACEMENT) && formValues.items.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("exportProposal.supplier")}:</span>
          {commonSupplierId(formValues.items) != null ? (
            <span className="font-medium">{supplierNameMap.get(commonSupplierId(formValues.items)!)}</span>
          ) : (
            <span className="text-destructive">{t("exportProposal.supplierMismatch")}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {t("exportProposal.total")}: {fields.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString("vi-VN")}₫
        </span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/exports")}>{t("common.cancel")}</Button>
        <Button onClick={onSubmit} disabled={!watchedType || fields.length === 0 || createMut.isPending || (watchedType === EXPORT_REASON.SALE && !watchedCustomerId)}>
          {createMut.isPending ? t("common.processing") : t("exportProposal.submit")}
        </Button>
      </div>
      </>
      )}

      <Dialog open={showDraftDialog} onOpenChange={(v) => { if (!v) { setShowDraftDialog(false); dismiss() } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("exportProposal.restoreTitle")}</DialogTitle>
            <DialogDescription>{t("exportProposal.restoreDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDraftDialog(false); dismiss() }}>{t("dialog.discard")}</Button>
            <Button onClick={() => { setShowDraftDialog(false); restore() }}>{t("dialog.restore")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerSelectModal
        open={selectModalOpen}
        onOpenChange={setSelectModalOpen}
        selectedCustomerId={watchedCustomerId ? Number(watchedCustomerId) : null}
        onSelect={(id, name) => { form.setValue("customerId", String(id)); setCustomerName(name) }}
      />
    </div>
  )
}