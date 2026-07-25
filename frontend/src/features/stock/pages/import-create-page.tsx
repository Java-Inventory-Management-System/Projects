import { useState, useMemo, useReducer, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useBlocker, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createImportReceipt } from "@/services/import-service"
import { useCategoryZones } from "@/hooks/use-category-zones"
import { useFormDraft, clearDraft } from "@/hooks/use-form-draft"
import { useProducts } from "@/hooks/use-products"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrderById } from "@/hooks/use-purchase-orders"
import { useLocations } from "@/hooks/use-locations"
import { importFormSchema } from "@/features/stock/schemas/import-schema"
import type { ImportFormData } from "@/features/stock/schemas/import-schema"
import { itemReducer } from "@/features/stock/reducers/import-create-reducer"
import { FieldError } from "@/components/ui/field"
import { toast } from "@/utils/toast"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { ImportCreateSidebar } from "../components/import-create-sidebar"
import { ImportStepProducts } from "../components/import-create-step-products"
import { ImportStepSerials } from "../components/import-create-step-serials"
import { ImportStepQc } from "../components/import-create-step-qc"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const STEPS = [
  { num: 1, label: "NCC & PO" },
  { num: 2, label: "SP & SL" },
  { num: 3, label: "Serial" },
  { num: 4, label: "QC & Xác nhận" },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              current === s.num
                ? "bg-primary text-primary-foreground"
                : current > s.num
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                current === s.num
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : current > s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
              }`}
            >
              {current > s.num ? <Check className="size-3" /> : s.num}
            </span>
            {s.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-1.5 h-px w-6 ${current > s.num ? "bg-primary/40" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export const ImportCreatePage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { hasRole } = usePermission()
  const isManager = hasRole(...ROLES.MANAGER)
  const poIdParam = searchParams.get("poId")

  const [step, setStep] = useState(1)
  const [items, dispatch] = useReducer(itemReducer, [])
  const [showDraftDialog, setShowDraftDialog] = useState(false)
  const [qcBlocked, setQcBlocked] = useState(false)

  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const form = useForm<ImportFormData>({
    resolver: zodResolver(importFormSchema.omit({ items: true })),
    defaultValues: { supplierId: "", receiptDate: defaultDate, referenceDoc: "", note: "" },
  })
  const watchedNote = form.watch("note")
  const watchedSupplierId = form.watch("supplierId")
  const watchedReceiptDate = form.watch("receiptDate")
  const watchedReferenceDoc = form.watch("referenceDoc")

  const draftState = useMemo(
    () => ({
      supplierId: watchedSupplierId,
      receiptDate: watchedReceiptDate,
      referenceDoc: watchedReferenceDoc,
      note: watchedNote,
      items: items.map((i) => ({ ...i })),
    }),
    [watchedSupplierId, watchedReceiptDate, watchedReferenceDoc, watchedNote, items],
  )
  const isDirty = items.length > 0
  const { draftAvailable, restore, dismiss } = useFormDraft(
    "/stock/imports/new",
    draftState as unknown as Record<string, unknown>,
    isDirty,
    (data) => {
      const d = data as typeof draftState
      form.setValue("supplierId", d.supplierId ?? "")
      form.setValue("receiptDate", d.receiptDate ?? defaultDate)
      form.setValue("referenceDoc", d.referenceDoc ?? "")
      form.setValue("note", d.note ?? "")
      dispatch({ type: "SET_ITEMS", payload: d.items ?? [] })
    },
  )

  useEffect(() => {
    if (draftAvailable) setShowDraftDialog(true)
  }, [draftAvailable])

  const { data: productsRes } = useProducts(0, 100)
  const { data: suppliers = [] } = useSuppliers()
  const { data: locations = [] } = useLocations()
  const { data: zoneMap = {} } = useCategoryZones()
  const { data: po } = usePurchaseOrderById(Number(poIdParam))

  useEffect(() => {
    if (po) {
      form.setValue("supplierId", String(po.supplierId))
      form.setValue("referenceDoc", po.poCode)
    }
  }, [po, form])

  const products = useMemo(() => productsRes?.content ?? [], [productsRes])
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
    onSuccess: () => {
      clearDraft("/stock/imports/new")
      queryClient.invalidateQueries({ queryKey: ["import-receipts"] })
      toast.success("Tạo phiếu nhập thành công")
      navigate("/stock/imports")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Có lỗi xảy ra khi tạo phiếu nhập")
    },
  })

  const serialIssues = useMemo(
    () =>
      items
        .map((i) => {
          if (i.serials.length < i.quantity)
            return { name: i.productName, issue: `thiếu ${i.quantity - i.serials.length} serial` }
          if (i.serials.length > i.quantity)
            return { name: i.productName, issue: `thừa ${i.serials.length - i.quantity} serial` }
          return null
        })
        .filter(Boolean) as { name: string; issue: string }[],
    [items],
  )
  const allSerialsOk = serialIssues.length === 0
  const locationIssues = items.filter((i) => !i.locationId)
  const allLocationsOk = locationIssues.length === 0

  const onSubmit = form.handleSubmit((values) => {
    if (!allSerialsOk) {
      toast.error(serialIssues.map((s) => `${s.name}: ${s.issue}`).join("\n"))
      setStep(3)
      return
    }
    if (!allLocationsOk) {
      toast.error("Vui lòng chọn vị trí kho cho tất cả sản phẩm")
      setStep(2)
      return
    }
    const purchaseOrderId = poIdParam ? Number(poIdParam) : undefined
    createMut.mutate({
      receiptCode: values.referenceDoc || undefined,
      supplierId: Number(values.supplierId),
      note: values.note || undefined,
      purchaseOrderId,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        warrantyMonths: i.warrantyMonths,
        serialNumbers: i.serials.length > 0 ? i.serials : undefined,
        locationId: i.locationId ? Number(i.locationId) : undefined,
      })),
    })
  })

  const canNext = useMemo(() => {
    if (step === 1) return !!watchedSupplierId
    if (step === 2) return items.length > 0
    if (step === 3) return items.length > 0 && allSerialsOk
    return true
  }, [step, watchedSupplierId, items, allSerialsOk])

  return (
    <div className="mx-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 lg:gap-6">
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/stock/imports")}>
              &larr; Quay lại
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu nhập kho</h1>
          </div>
        </div>

        <StepIndicator current={step} />

        {poIdParam && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
            Nhập kho từ đơn đặt hàng <span className="font-mono font-medium">{po?.poCode ?? "..."}</span>
            {po ? null : <span className="ml-2 text-blue-500">Đang tải thông tin...</span>}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Bước 1/4 — Thông tin nhà cung cấp & chứng từ
            </h2>
            <div className="grid gap-4 sm:grid-cols-3 shrink-0">
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
                <FieldError errors={form.formState.errors.supplierId ? [{ message: form.formState.errors.supplierId.message ?? "" }] : undefined} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptDate">
                  Ngày nhập <span className="text-destructive">*</span>
                </Label>
                <Input id="receiptDate" type="date" {...form.register("receiptDate")} />
                <FieldError errors={form.formState.errors.receiptDate ? [{ message: form.formState.errors.receiptDate.message ?? "" }] : undefined} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceDoc">Số hóa đơn/chứng từ</Label>
                <Input id="referenceDoc" placeholder="Không bắt buộc" {...form.register("referenceDoc")} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <ImportStepProducts
            items={items}
            dispatch={dispatch}
            products={products}
            locations={locations}
            zoneMap={zoneMap}
            isManager={isManager}
          />
        )}

        {step === 3 && <ImportStepSerials items={items} dispatch={dispatch} isManager={isManager} />}

        {step === 4 && (
          <ImportStepQc
            items={items}
            note={watchedNote}
            setNote={(v) => form.setValue("note", v)}
            onQcStatus={(status) => setQcBlocked(status.hasRecords && !status.done)}
          />
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="size-4 mr-1" /> Quay lại
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/stock/imports")}>
                Hủy
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="ghost" onClick={() => navigate("/stock/imports")}>
                Hủy
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                Tiếp theo <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={onSubmit}
                      disabled={!watchedSupplierId || items.length === 0 || createMut.isPending || qcBlocked}
                    >
                      {createMut.isPending ? "Đang tạo..." : "Tạo phiếu nhập"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {(!watchedSupplierId || items.length === 0) && (
                  <TooltipContent side="top" className="text-xs">
                    {!watchedSupplierId && <p>● Chưa chọn nhà cung cấp</p>}
                    {items.length === 0 && <p>● Chưa có sản phẩm</p>}
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      <div className="hidden lg:block space-y-4 self-start sticky top-4">
        <ImportCreateSidebar />
      </div>

      <Dialog
        open={showDraftDialog}
        onOpenChange={(v) => {
          if (!v) {
            setShowDraftDialog(false)
            dismiss()
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Khôi phục dữ liệu</DialogTitle>
            <DialogDescription>Bạn có dữ liệu nhập kho chưa lưu từ lần trước. Muốn khôi phục?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDraftDialog(false)
                dismiss()
              }}
            >
              Bỏ qua
            </Button>
            <Button
              onClick={() => {
                setShowDraftDialog(false)
                restore()
              }}
            >
              Khôi phục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
