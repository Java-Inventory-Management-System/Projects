import { useState, useEffect, useMemo } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createExportReceipt } from "@/services/export-service"
import { useProducts } from "@/hooks/use-products"
import { useInventory } from "@/hooks/use-inventory"
import { CustomerSelectModal } from "@/features/stock/components/customer-select-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Search } from "lucide-react"
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
import { EXPORT_REASON } from "@/utils/types"
import type { ExportReason } from "@/utils/types"

interface ProposalFormFields {
  reason: string
  customerId: string
  note: string
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
  ]
  const qc = useQueryClient()
  const [customerName, setCustomerName] = useState("")
  const [selectModalOpen, setSelectModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [showDraftDialog, setShowDraftDialog] = useState(false)

  const { data: productsRes } = useProducts(0, 100)
  const products = useMemo(() => productsRes?.content ?? [], [productsRes])
  const { data: invRes } = useInventory(0, 500)
  const invMap = useMemo(() => {
    const m = new Map<number, number>()
    invRes?.content?.forEach((i: { productId: number; quantity: number }) => m.set(i.productId, i.quantity))
    return m
  }, [invRes])

  const form = useForm<ProposalFormFields>({
    defaultValues: { reason: "", customerId: "", note: "", externalReference: "", items: [] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })

  const formValues = form.watch()
  const draftState = useMemo(
    () => ({ reason: formValues.reason, customerId: formValues.customerId, customerName, note: formValues.note, externalReference: formValues.externalReference, items: formValues.items }),
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
        reason: d.reason ?? "",
        customerId: d.customerId ?? "",
        note: d.note ?? "",
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
    onSuccess: (data) => {
      clearDraft("/stock/exports/new")
      qc.invalidateQueries({ queryKey: ["export-receipts"] })
      toast.success(t("exportProposal.createSuccess"))
      navigate(`/stock/exports/${data.id}/fulfill`)
    },
    onError: (err: Error) => toast.error(err.message || t("exportProposal.createError")),
  })

  const addItem = () => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === Number(selectedProductId))
    if (!product) return
    const avail = invMap.get(product.id) ?? 0
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
    console.log("[submit] form submitted, values:", values)
    if (!values.reason) { toast.error(t("exportProposal.reasonRequired")); return }
    if (values.items.length === 0) { toast.error(t("exportProposal.noItems")); return }
    if (values.reason === EXPORT_REASON.SALE && !values.customerId) { toast.error(t("exportProposal.customerRequired")); return }
    for (const item of values.items) {
      const avail = invMap.get(item.productId) ?? 0
      if (item.quantity > avail) {
        toast.error(t("exportProposal.insufficientStock", { product: item.productName, available: avail, requested: item.quantity }))
        return
      }
    }
    console.log("[submit] calling mutate...")
    createMut.mutate({
      reason: values.reason as ExportReason,
      customerId: values.customerId ? Number(values.customerId) : null,
      note: values.note || null,
      externalReference: values.externalReference || null,
      items: values.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    })
    console.log("[submit] mutate called")
  })

  const watchedReason = form.watch("reason")
  const watchedCustomerId = form.watch("customerId")

  return (
    <div className="mx-auto max-w-4xl space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/exports")}>
          &larr; {t("common.back")}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("exportProposal.title")}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reason">{t("exportProposal.reason")}</Label>
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
          />
        </div>
        {watchedReason === EXPORT_REASON.WARRANTY_REPLACEMENT && (
          <div className="space-y-2">
            <Label htmlFor="externalReference">{t("exportProposal.warrantyCode")}</Label>
            <Input id="externalReference" placeholder={t("exportProposal.warrantyPlaceholder")} {...form.register("externalReference")} />
          </div>
        )}
        {watchedReason === EXPORT_REASON.SALE && (
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
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("exportProposal.selectProductPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name} ({p.sku}) &mdash; {p.sellPrice?.toLocaleString("vi-VN")}₫ &mdash; {t("exportProposal.inStock", { count: invMap.get(p.id) ?? 0 })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    <Input type="number" min={1} max={invMap.get(item.productId) ?? 0} className="h-8 w-16 text-right"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      onBlur={(e) => {
                        const max = invMap.get(item.productId) ?? 0
                        const val = Number(e.target.value)
                        if (val > max) {
                          form.setValue(`items.${index}.quantity`, max)
                          toast.warning(t("exportProposal.maxQuantity", { max }))
                        }
                      }} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} className="h-8 w-24 text-right"
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

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {t("exportProposal.total")}: {fields.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString("vi-VN")}₫
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">{t("exportProposal.note")}</Label>
        <Textarea id="note" placeholder={t("form.noteOptional")} {...form.register("note")} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/exports")}>{t("common.cancel")}</Button>
        <Button onClick={onSubmit} disabled={!watchedReason || fields.length === 0 || createMut.isPending || (watchedReason === EXPORT_REASON.SALE && !watchedCustomerId)}>
          {createMut.isPending ? t("common.processing") : t("exportProposal.submit")}
        </Button>
      </div>

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