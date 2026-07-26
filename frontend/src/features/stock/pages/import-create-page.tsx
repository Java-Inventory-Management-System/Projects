import { useState, useMemo, useReducer, useEffect, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useBlocker, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createImportReceipt, confirmImportReceipt, getImportReceiptById } from "@/services/import-service"
import { useFormDraft, clearDraft } from "@/hooks/use-form-draft"
import { useProducts } from "@/hooks/use-products"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrderById } from "@/hooks/use-purchase-orders"
import { useLocationMap } from "@/hooks/use-location-map"
import { useCategoryZones } from "@/hooks/use-category-zones"
import { importFormSchema } from "@/features/stock/schemas/import-schema"
import type { ImportFormData } from "@/features/stock/schemas/import-schema"
import { itemReducer } from "@/features/stock/reducers/import-create-reducer"
import { FieldError } from "@/components/ui/field"
import { toast } from "@/utils/toast"
import { usePermission } from "@/hooks/use-permission"
import { IMPORT_RECEIPT_STATUS, type DiscrepancyNote, type QcRecord } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

type Mode = "create" | "update"

function StepIndicator({ current, mode }: { current: number; mode: Mode }) {
  const steps = mode === "create"
    ? [
        { num: 1, label: "NCC & PO" },
        { num: 2, label: "SP & SL" },
      ]
    : [
        { num: 3, label: "Serial" },
        { num: 4, label: "QC & Xác nhận" },
      ]
  const offset = mode === "create" ? 0 : 2
  return (
    <div className="flex items-center gap-0">
      {mode === "update" && (
        <>
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
            <span className="flex size-5 items-center justify-center rounded-full text-[11px] font-bold bg-primary text-primary-foreground">
              <Check className="size-3" />
            </span>
            Thông tin phiếu
          </div>
          <div className="mx-1.5 h-px w-6 bg-primary/40" />
        </>
      )}
      {steps.map((s, i) => (
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
              {current > s.num ? <Check className="size-3" /> : s.num - offset}
            </span>
            {s.label}
          </div>
          {i < steps.length - 1 && (
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
  const isManager = hasRole("MANAGER")
  const isStock = hasRole("STOCK")

  const receiptId = searchParams.get("id")
  const mode: Mode = receiptId ? "update" : "create"
  const poIdParam = searchParams.get("poId")

  const { data: receipt, isLoading: receiptLoading } = useQuery({
    queryKey: ["import-receipt", receiptId],
    queryFn: () => getImportReceiptById(Number(receiptId)),
    enabled: mode === "update" && !!receiptId,
  })

  useEffect(() => {
    if (mode === "create" && !isManager) {
      toast.error("Bạn không có quyền tạo phiếu nhập")
      navigate("/stock/imports")
    }
  }, [mode, isManager, navigate])

  useEffect(() => {
    if (mode === "update" && !isStock) {
      toast.error("Bạn không có quyền nhập serial")
      navigate("/stock/imports")
    }
  }, [mode, isStock, navigate])

  useEffect(() => {
    if (receipt && receipt.status !== IMPORT_RECEIPT_STATUS.DRAFT && receipt.status !== IMPORT_RECEIPT_STATUS.PENDING_APPROVAL) {
      toast.error("Phiếu không ở trạng thái chờ xử lý")
      navigate("/stock/imports")
    }
  }, [receipt, navigate])

  const [step, setStep] = useState(mode === "create" ? 1 : 3)
  const [items, dispatch] = useReducer(itemReducer, [])

  useEffect(() => {
    setStep(mode === "create" ? 1 : 3)
  }, [mode])
  const navigatingAfterMut = useRef(false)
  const [showDraftDialog, setShowDraftDialog] = useState(false)
  const [qcBlocked, setQcBlocked] = useState(false)
  const [note, setNote] = useState("")
  const [discrepancyNotes, setDiscrepancyNotes] = useState<DiscrepancyNote[]>([])
  const [qcRecords, setQcRecords] = useState<QcRecord[]>([])

  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const form = useForm<ImportFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(importFormSchema.omit({ items: true })) as any,
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
    isDirty && mode === "create",
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
    if (draftAvailable && mode === "create") setShowDraftDialog(true)
  }, [draftAvailable, mode])

  const { data: productsRes } = useProducts(0, 100)
  const { data: suppliers = [] } = useSuppliers()
  const { data: po } = usePurchaseOrderById(Number(poIdParam))

  useEffect(() => {
    if (po) {
      form.setValue("supplierId", String(po.supplierId))
      form.setValue("referenceDoc", po.poCode)
    }
  }, [po, form])

  const products = useMemo(() => productsRes?.content ?? [], [productsRes])

  const { data: locationMap } = useLocationMap()
  const { data: categoryZones } = useCategoryZones()

  const productCategoryMap = useMemo(() => {
    const map: Record<number, number | null> = {}
    for (const p of products) {
      map[p.id] = p.categoryId
    }
    return map
  }, [products])

  const ZONE_ORDER = ["A", "B", "C", "D", "E"]

  useEffect(() => {
    if (!receipt) return
    dispatch({
      type: "SET_ITEMS",
      payload: receipt.items.map((item) => ({
        tempId: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku ?? "",
        categoryId: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        warrantyMonths: item.warrantyMonths,
        serials: [],
        locationId: item.locationId ? String(item.locationId) : "",
        itemStatus: "NORMAL" as const,
        notReceivedReason: "",
      })),
    })
    setNote(receipt.note ?? "")
  }, [receipt])

  useEffect(() => {
    if (locationMap === undefined || items.length === 0) return
    const binOccupancy = new Map(locationMap.zones.flatMap((z) => z.shelves).flatMap((s) => s.bins).map((b) => [b.id, b.productCount]))
    for (const item of items) {
      if (item.locationId) continue
      for (const zoneCode of ZONE_ORDER) {
        const zone = locationMap.zones.find((z) => z.zoneCode === zoneCode)
        if (!zone) continue
        const bin = zone.shelves
          .flatMap((s) => s.bins)
          .sort((a, b) => a.fullCode.localeCompare(b.fullCode))
          .find((b) => b.maxCapacity == null || binOccupancy.get(b.id)! < b.maxCapacity)
        if (bin) {
          dispatch({ type: "UPDATE_ITEM", tempId: item.tempId, field: "locationId", value: String(bin.id) })
          binOccupancy.set(bin.id, binOccupancy.get(bin.id)! + 1)
          break
        }
      }
    }
  }, [locationMap, items])

  const suggestedLocations = useMemo(() => {
    const map: Record<number, number> = {}
    if (!locationMap) return map
    const catZones = categoryZones ?? {}
    for (const item of items) {
      const catId = item.categoryId ?? productCategoryMap[item.productId]
      const preferredZone = catId ? catZones[catId] : undefined
      const zonesToTry = preferredZone && ZONE_ORDER.includes(preferredZone)
        ? [preferredZone, ...ZONE_ORDER.filter((z) => z !== preferredZone)]
        : ZONE_ORDER
      for (const zoneCode of zonesToTry) {
        const zone = locationMap.zones.find((z) => z.zoneCode === zoneCode)
        if (!zone) continue
        const bins = zone.shelves
          .flatMap((s) => s.bins)
          .filter((b) => b.maxCapacity == null || b.productCount < b.maxCapacity)
          .sort((a, b) => a.fullCode.localeCompare(b.fullCode))
        if (bins.length > 0) {
          map[item.tempId] = bins[0].id
          break
        }
      }
    }
    return map
  }, [items, productCategoryMap, categoryZones, locationMap])

  const createMut = useMutation({
    mutationFn: createImportReceipt,
    onSuccess: () => {
      clearDraft("/stock/imports/new")
      queryClient.invalidateQueries({ queryKey: ["import-receipts"] })
      toast.success("Tạo phiếu nhập thành công")
      navigatingAfterMut.current = true
      navigate("/stock/imports")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Có lỗi xảy ra khi tạo phiếu nhập")
    },
  })

  const submitMut = useMutation({
    mutationFn: (data: Parameters<typeof confirmImportReceipt>[1]) =>
      confirmImportReceipt(Number(receiptId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["import-receipts"] })
      queryClient.invalidateQueries({ queryKey: ["import-receipt", receiptId] })
      toast.success("Gửi duyệt thành công")
      navigatingAfterMut.current = true
      navigate("/stock/imports")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Có lỗi xảy ra")
    },
  })

  const hasUnsaved = mode === "create"
    ? items.length > 0 && !createMut.isSuccess
    : items.some((i) => i.serials.length > 0) && !submitMut.isSuccess

  useBlocker(
    ({ currentLocation, nextLocation }) =>
      !navigatingAfterMut.current && hasUnsaved && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!hasUnsaved) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [hasUnsaved])

  const itemsReadyForSubmit = useMemo(() => {
    if (mode === "create") return true
    return items.every((i) => i.serials.length > 0 || i.itemStatus === "NOT_RECEIVED")
  }, [items, mode])

  const onCreateSubmit = form.handleSubmit((values) => {
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
      })),
    })
  })

  const onSubmitStep4 = () => {
    if (!itemsReadyForSubmit) {
      const missingItems = items.filter((i) => i.serials.length === 0 && i.itemStatus !== "NOT_RECEIVED")
      toast.error(`Còn sản phẩm chưa nhập serial và chưa đánh dấu NOT_RECEIVED: ${missingItems.map((i) => i.productName).join(", ")}`)
      return
    }
    const serials = items
      .filter((i) => i.itemStatus === "NORMAL" && i.serials.length > 0)
      .map((i) => ({
        itemId: i.tempId,
        serialNumbers: i.serials,
        locationId: i.locationId ? Number(i.locationId) : null,
      }))
    submitMut.mutate({ receiptId: Number(receiptId), serials })
  }

  const canNext = useMemo(() => {
    if (mode === "create") {
      if (step === 1) return !!watchedSupplierId
      if (step === 2) return items.length > 0
    }
    return true
  }, [step, watchedSupplierId, items, mode])

  if (mode === "update" && receiptLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 lg:gap-6">
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/stock/imports")}>
              &larr; Quay lại
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">
              {mode === "create" ? "Tạo phiếu nhập kho" : "Nhập serial & kiểm tra"}
            </h1>
            {mode === "update" && receipt && (
              <Badge variant="secondary">{receipt.receiptCode}</Badge>
            )}
          </div>
        </div>

        <StepIndicator current={step} mode={mode} />

        {mode === "update" && receipt && (
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">NCC:</span>
                  <p className="font-medium">{receipt.supplierName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Ngày tạo:</span>
                  <p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Người tạo:</span>
                  <p className="font-medium">{receipt.createdByName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Ghi chú:</span>
                  <p className="font-medium">{receipt.note ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {poIdParam && mode === "create" && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
            Nhập kho từ đơn đặt hàng <span className="font-mono font-medium">{po?.poCode ?? "..."}</span>
            {po ? null : <span className="ml-2 text-blue-500">Đang tải thông tin...</span>}
          </div>
        )}

        {mode === "create" && step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Bước 1/2 — Thông tin nhà cung cấp & chứng từ
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

        {mode === "create" && step === 2 && (
          <ImportStepProducts
            items={items}
            dispatch={dispatch}
            products={products}
            isManager={isManager}
          />
        )}

        {step === 3 && mode === "update" && (
          <ImportStepSerials
            items={items}
            dispatch={dispatch}
            discrepancyNotes={discrepancyNotes}
            onDiscrepancyNotesChange={setDiscrepancyNotes}
            suggestedLocations={suggestedLocations}
          />
        )}

        {step === 4 && mode === "update" && (
          <ImportStepQc
            items={items}
            note={note}
            setNote={setNote}
            onQcStatus={(status) => setQcBlocked(status.hasRecords && !status.done)}
            onQcRecordsChange={setQcRecords}
          />
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {step > (mode === "create" ? 1 : 3) ? (
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
            {step > (mode === "create" ? 1 : 3) && (
              <Button variant="ghost" onClick={() => navigate("/stock/imports")}>
                Hủy
              </Button>
            )}
            {mode === "create" && step < 2 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                Tiếp theo <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : mode === "create" ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={onCreateSubmit}
                      disabled={!watchedSupplierId || items.length === 0 || createMut.isPending}
                    >
                      {createMut.isPending ? "Đang tạo..." : "Tạo phiếu"}
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
            ) : step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                Tiếp theo <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={onSubmitStep4}
                      disabled={!itemsReadyForSubmit || submitMut.isPending || qcBlocked}
                    >
                      {submitMut.isPending ? "Đang gửi..." : "Xác nhận"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {(!itemsReadyForSubmit || qcBlocked) && (
                  <TooltipContent side="top" className="text-xs">
                    {!itemsReadyForSubmit && <p>● Còn sản phẩm chưa nhập serial hoặc chưa đánh dấu NOT_RECEIVED</p>}
                    {qcBlocked && <p>● Còn serial QC fail chưa nhập lý do</p>}
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
