import { useState, useMemo, useCallback, useEffect } from "react"
import { useNavigate, useBlocker, useSearchParams, useLocation } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createImportReceipt } from "@/services/import-service"
import { suggestLocation } from "@/utils/suggest-location"
import { useCategoryZones } from "@/hooks/use-category-zones"
import { useFormDraft, clearDraft } from "@/hooks/use-form-draft"
import { useProducts } from "@/hooks/use-products"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrderById } from "@/hooks/use-purchase-orders"
import { useLocations } from "@/hooks/use-locations"
import { importFormSchema } from "@/features/stock/schemas/import-schema"
import type { ImportFormData } from "@/features/stock/schemas/import-schema"
import { FieldError } from "@/components/ui/field"
import { toast } from "@/utils/toast"
import { usePermission } from "@/hooks/use-permission"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
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
import { LocationPicker } from "@/features/stock/components/location-picker"
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
import { Trash2, Plus, ScanLine, MapPin, Check, ChevronsUpDown, Circle, CircleCheckBig, ClipboardList, ArrowLeft, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, X } from "lucide-react"
import { SerialModal } from "../components/serial-modal"
import { ImportCreateSidebar } from "../components/import-create-sidebar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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

interface QcRecord {
  serial: string
  productName: string
  passed: boolean
  failReason: string
}

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
          <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            current === s.num
              ? "bg-primary text-primary-foreground"
              : current > s.num
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
          }`}>
            <span className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
              current === s.num
                ? "bg-primary-foreground/20 text-primary-foreground"
                : current > s.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
            }`}>
              {current > s.num ? <Check className="size-3" /> : s.num}
            </span>
            {s.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-1.5 h-px w-6 ${
              current > s.num ? "bg-primary/40" : "bg-border"
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

export const ImportCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const { hasRole } = usePermission()
  const isManager = hasRole("MANAGER", "ADMIN")
  const poIdParam = searchParams.get("poId")

  const [step, setStep] = useState(1)
  const [supplierId, setSupplierId] = useState("")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<LineItem[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [referenceDoc, setReferenceDoc] = useState("")
  const [serialModalOpen, setSerialModalOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<number | null>(null)
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => { if (items.length === 0) setSubmitted(false) }, [items])
  const [pasteText, setPasteText] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [locationPickerItem, setLocationPickerItem] = useState<number | null>(null)
  const [showDraftDialog, setShowDraftDialog] = useState(false)

  const draftState = useMemo(() => ({
    supplierId, receiptDate, referenceDoc, note,
    items: items.map((i) => ({ ...i })),
  }), [supplierId, receiptDate, referenceDoc, note, items])
  const isDirty = items.length > 0
  const { draftAvailable, restore, dismiss } = useFormDraft(
    "/stock/imports/new",
    draftState as unknown as Record<string, unknown>,
    isDirty,
    (data) => {
      const d = data as typeof draftState
      setSupplierId(d.supplierId ?? "")
      setReceiptDate(d.receiptDate ?? new Date().toISOString().slice(0, 10))
      setReferenceDoc(d.referenceDoc ?? "")
      setNote(d.note ?? "")
      setItems(d.items ?? [])
    },
  )

  useEffect(() => { if (draftAvailable) setShowDraftDialog(true) }, [draftAvailable])

  const { data: productsRes } = useProducts(0, 100)
  const { data: suppliers = [] } = useSuppliers()
  const { data: locations = [] } = useLocations()
  const { data: zoneMap = {} } = useCategoryZones()
  const { data: po } = usePurchaseOrderById(Number(poIdParam))

  useEffect(() => {
    if (po) {
      setSupplierId(String(po.supplierId))
      setReferenceDoc(po.poCode)
    }
  }, [po])

  const products = useMemo(() => productsRes?.content ?? [], [productsRes])
  const activeItem = items.find((i) => i.tempId === activeItemId)
  const hasUnsaved = items.length > 0

  useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsaved && !submitted && currentLocation.pathname !== nextLocation.pathname,
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
    onSuccess: () => { clearDraft("/stock/imports/new"); qc.invalidateQueries({ queryKey: ["import-receipts"] }); toast.success("Tạo phiếu nhập thành công"); navigate("/stock/imports") },
    onError: (err: Error) => { setSubmitted(true); toast.error(err.message || "Có lỗi xảy ra khi tạo phiếu nhập") },
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

  const handlePasteSerials = useCallback(() => {
    const lines = pasteText.split("\n").filter(Boolean)
    let parsed = 0
    setItems((prev) =>
      prev.map((item) => {
        const line = lines.find((l) => l.trim().toLowerCase().startsWith(item.productSku.toLowerCase()))
        if (!line) return item
        const colonIdx = line.indexOf(":")
        if (colonIdx === -1) return item
        const serials = line
          .slice(colonIdx + 1)
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
        if (serials.length === 0) return item
        parsed++
        return { ...item, serials }
      }),
    )
    toast.success(`Đã gán serial cho ${parsed} sản phẩm`)
    if (parsed > 0) { setPasteDialogOpen(false); setPasteText("") }
  }, [pasteText])

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

  const totalSerials = useMemo(() => items.reduce((s, i) => s + i.serials.length, 0), [items])
  const allSerials = useMemo(() => items.flatMap((i) => i.serials.map((s) => ({ serial: s, productName: i.productName }))), [items])

  const [qcRecords, setQcRecords] = useState<QcRecord[]>([])
  useEffect(() => {
    if (step === 4 && qcRecords.length === 0 && allSerials.length > 0) {
      setQcRecords(allSerials.map((s) => ({ serial: s.serial, productName: s.productName, passed: true, failReason: "" })))
    }
  }, [step, allSerials, qcRecords.length])

  const qcChecked = qcRecords.filter((r) => !r.passed || r.failReason || true).length
  const qcFailed = qcRecords.filter((r) => !r.passed)
  const qcDone = qcRecords.length > 0 && qcRecords.every((r) => r.passed || r.failReason.trim().length > 0)

  const updateQc = useCallback((serial: string, field: keyof QcRecord, value: boolean | string) => {
    setQcRecords((prev) => prev.map((r) => r.serial === serial ? { ...r, [field]: value } : r))
  }, [])

  const handleSubmit = useCallback(() => {
    const raw: ImportFormData = { supplierId, receiptDate, referenceDoc, note, items }
    const parsed = importFormSchema.safeParse(raw)
    if (!parsed.success) {
      const e: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => { e[issue.path.join(".")] = issue.message })
      setFormErrors(e)
      setStep(1)
      return
    }
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
      receiptCode: referenceDoc || undefined,
      supplierId: Number(supplierId),
      note: note || null,
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
  }, [supplierId, receiptDate, referenceDoc, note, items, allSerialsOk, serialIssues, allLocationsOk, poIdParam, createMut])

  const canNext = useMemo(() => {
    if (step === 1) return !!supplierId
    if (step === 2) return items.length > 0
    if (step === 3) return items.length > 0 && allSerialsOk
    return true
  }, [step, supplierId, items, allSerialsOk])

  const foundLocation = (item: LineItem) => {
    const loc = locations.find((l) => l.id === Number(item.locationId))
    return loc
  }

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

        {/* === STEP 1: NCC & PO === */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Bước 1/4 — Thông tin nhà cung cấp & chứng từ</h2>
            <div className="grid gap-4 sm:grid-cols-3 shrink-0">
              <div className="space-y-2">
                <Label htmlFor="supplier">Nhà cung cấp <span className="text-destructive">*</span></Label>
                <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setFormErrors((prev) => { const n = { ...prev }; delete n.supplierId; return n }) }}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Chọn NCC" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={formErrors.supplierId ? [{ message: formErrors.supplierId }] : undefined} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptDate">Ngày nhập <span className="text-destructive">*</span></Label>
                <Input id="receiptDate" type="date" required value={receiptDate} onChange={(e) => { setReceiptDate(e.target.value); setFormErrors((prev) => { const n = { ...prev }; delete n.receiptDate; return n }) }} />
                <FieldError errors={formErrors.receiptDate ? [{ message: formErrors.receiptDate }] : undefined} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceDoc">Số hóa đơn/chứng từ</Label>
                <Input id="referenceDoc" placeholder="Không bắt buộc" value={referenceDoc} onChange={(e) => setReferenceDoc(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* === STEP 2: SP & SL === */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Bước 2/4 — Chọn sản phẩm & số lượng</h2>

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
                      {isManager && <TableHead className="w-28 text-right">Đơn giá</TableHead>}
                      {isManager && <TableHead className="w-16 text-right">BH(th)</TableHead>}
                      {isManager && <TableHead className="w-28 text-right">Thành tiền</TableHead>}
                      <TableHead className="w-44">Vị trí</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const hasLocation = !!item.locationId
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
                                  {loc.name ?? loc.fullCode}
                                </Badge>
                                <Sheet open={locationPickerItem === item.tempId} onOpenChange={(v) => { if (!v) setLocationPickerItem(null) }}>
                                  <SheetTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs px-1" onClick={() => setLocationPickerItem(item.tempId)}>
                                      Đổi
                                    </Button>
                                  </SheetTrigger>
                                  <SheetContent side="right" className="w-[320px]">
                                    <SheetHeader>
                                      <SheetTitle className="text-sm">Chọn vị trí — {item.productName}</SheetTitle>
                                    </SheetHeader>
                                    <div className="mt-4">
                                      <LocationPicker
                                        value={item.locationId}
                                        onSelect={(v) => { updateItem(item.tempId, "locationId", v); setLocationPickerItem(null) }}
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
        )}

        {/* === STEP 3: Serial === */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Bước 3/4 — Nhập serial</h2>

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
                      <TableHead className="w-28 text-center">Serial</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const serialCount = item.serials.length
                      const serialOk = serialCount === item.quantity
                      return (
                        <TableRow key={item.tempId}>
                          <TableCell className="font-medium text-sm truncate max-w-[200px]" title={item.productName}>
                            <span className="inline-flex items-center gap-1.5">
                              {serialOk ? (
                                <CircleCheckBig className="size-4 shrink-0 text-green-600" />
                              ) : (
                                <Circle className="size-4 shrink-0 text-muted-foreground" />
                              )}
                              {item.productName}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{item.quantity}</TableCell>
                          {isManager && <TableCell className="text-right tabular-nums text-sm">{item.unitPrice.toLocaleString("vi-VN")}₫</TableCell>}
                          {isManager && <TableCell className="text-right text-sm">{item.warrantyMonths}</TableCell>}
                          {isManager && <TableCell className="text-right tabular-nums text-sm font-medium">{(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫</TableCell>}
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
              {isManager && (
                <span className="text-sm font-semibold">Tổng: {totalAmount.toLocaleString("vi-VN")}₫</span>
              )}
              <p className="text-xs text-muted-foreground italic">
                Tổng serial cần nhập: {items.reduce((s, i) => s + i.quantity, 0)} &middot; Đã nhập: {totalSerials}
              </p>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setPasteDialogOpen(true)}>
                <ClipboardList className="size-3.5" />
                Dán serial hàng loạt
              </Button>
            </div>
          </div>
        )}

        {/* === STEP 4: QC & Xác nhận === */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Bước 4/4 — Kiểm tra chất lượng & xác nhận</h2>

            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Tiến độ kiểm tra</span>
                <span className="text-muted-foreground">{qcRecords.filter((r) => r.failReason || r.passed).length}/{qcRecords.length} serial</span>
              </div>
              <Progress value={qcRecords.length > 0 ? (qcRecords.filter((r) => r.failReason || r.passed).length / qcRecords.length) * 100 : 0} className="mt-2" />
            </div>

            {qcRecords.length === 0 && allSerials.length === 0 && (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Không có serial nào để kiểm tra — sản phẩm dạng BULK (hàng rời). Bạn có thể bỏ qua bước này.
              </div>
            )}

            {qcRecords.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {qcRecords.map((rec, idx) => (
                  <div key={rec.serial} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground w-6 shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-mono truncate">{rec.serial}</p>
                        <p className="text-xs text-muted-foreground">{rec.productName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant={rec.passed ? "default" : "outline"}
                        size="sm"
                        className="gap-1 text-xs h-8"
                        onClick={() => updateQc(rec.serial, "passed", true)}
                      >
                        <CircleCheck className="size-3.5" /> Pass
                      </Button>
                      <Button
                        variant={!rec.passed ? "destructive" : "outline"}
                        size="sm"
                        className="gap-1 text-xs h-8"
                        onClick={() => updateQc(rec.serial, "passed", false)}
                      >
                        <CircleAlert className="size-3.5" /> Fail
                      </Button>
                    </div>
                    {!rec.passed && (
                      <div className="w-48 shrink-0">
                        <Input
                          placeholder="Lý do fail..."
                          className="h-8 text-xs"
                          value={rec.failReason}
                          onChange={(e) => updateQc(rec.serial, "failReason", e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {qcFailed.length > 0 && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
                <p className="text-xs font-medium text-destructive">{qcFailed.length} serial fail — cần nhập lý do trước khi tạo phiếu</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note-step4">Ghi chú phiếu nhập</Label>
              <Textarea id="note-step4" placeholder="Ghi chú (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <div className="flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <MapPin className="size-4 shrink-0 mt-0.5" />
              <span>
                <strong>Vị trí gợi ý theo danh mục.</strong> Kho thực tế có thể khác — cần QL kho xác nhận khi duyệt.
              </span>
            </div>
          </div>
        )}

        {/* === STEP NAVIGATION === */}
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="size-4 mr-1" /> Quay lại
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/stock/imports")}>Hủy</Button>
            )}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="ghost" onClick={() => navigate("/stock/imports")}>Hủy</Button>
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
                      onClick={handleSubmit}
                      disabled={!supplierId || items.length === 0 || createMut.isPending || (qcRecords.length > 0 && !qcDone)}
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
            )}
          </div>
        </div>
      </div>

      <div className="hidden lg:block space-y-4 self-start sticky top-4">
        <ImportCreateSidebar />
      </div>

      <Dialog open={showDraftDialog} onOpenChange={(v) => { if (!v) { setShowDraftDialog(false); dismiss() } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Khôi phục dữ liệu</DialogTitle>
            <DialogDescription>
              Bạn có dữ liệu nhập kho chưa lưu từ lần trước. Muốn khôi phục?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDraftDialog(false); dismiss() }}>Bỏ qua</Button>
            <Button onClick={() => { setShowDraftDialog(false); restore() }}>Khôi phục</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dán serial hàng loạt</DialogTitle>
            <DialogDescription>
              Mỗi dòng một sản phẩm: <code className="text-xs bg-muted px-1">SKU: serial1, serial2</code>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[200px] font-mono text-sm"
            placeholder={"SKU-001: SN240701-001, SN240701-002\nSKU-002: SN240701-003"}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasteDialogOpen(false); setPasteText("") }}>Hủy</Button>
            <Button onClick={handlePasteSerials} disabled={!pasteText.trim()}>Áp dụng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
