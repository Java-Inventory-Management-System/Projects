import { useState, useMemo, useReducer, useEffect, useRef } from "react"
import { useNavigate, useBlocker, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createImportReceipt, confirmImportReceipt, getImportReceiptById } from "@/services/import-service"
import { usePurchaseOrders, usePurchaseOrderById } from "@/hooks/use-purchase-orders"
import { useProducts } from "@/hooks/use-products"
import { useLocationMap } from "@/hooks/use-location-map"
import { useCategoryZones } from "@/hooks/use-category-zones"
import { type DiscrepancyNote, type QcRecord } from "@/utils/types"
import { toast } from "@/utils/toast"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { ImportStepSerials } from "../components/import-create-step-serials"
import { ImportStepQc } from "../components/import-create-step-qc"
import { itemReducer } from "../reducers/import-create-reducer"
import { Label } from "@/components/ui/label"

const steps = [
  { num: 1, label: "Chọn đơn hàng" },
  { num: 2, label: "Nhập serial" },
  { num: 3, label: "QC & Xác nhận" },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
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
              {current > s.num ? <Check className="size-3" /> : s.num}
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
  const ZONE_ORDER = ["A", "B", "C", "D", "E"]

  const resumeId = searchParams.get("id")
  const isResume = !!resumeId

  const [step, setStep] = useState(isResume ? 2 : 1)
  const [receiptId, setReceiptId] = useState<number | null>(isResume ? Number(resumeId) : null)
  const [selectedPoId, setSelectedPoId] = useState<number | null>(null)
  const [items, dispatch] = useReducer(itemReducer, [])
  const navigatingAfterMut = useRef(false)
  const [qcBlocked, setQcBlocked] = useState(false)
  const [note, setNote] = useState("")
  const [discrepancyNotes, setDiscrepancyNotes] = useState<DiscrepancyNote[]>([])
  const [qcRecords, setQcRecords] = useState<QcRecord[]>([])

  const { data: poListRes } = usePurchaseOrders(0, 999, "createdAt,desc")
  const { data: po } = usePurchaseOrderById(Number(selectedPoId))
  const { data: productsRes } = useProducts(0, 100)
  const { data: locationMap } = useLocationMap()
  const { data: categoryZones } = useCategoryZones()

  const products = useMemo(() => productsRes?.content ?? [], [productsRes])

  const availablePOs = useMemo(
    () => (poListRes?.content ?? []).filter((po) => po.status !== "COMPLETED" && po.status !== "CANCELLED"),
    [poListRes],
  )

  const { data: receipt, isLoading: receiptLoading } = useQuery({
    queryKey: ["import-receipt", receiptId],
    queryFn: () => getImportReceiptById(Number(receiptId)),
    enabled: !!receiptId,
  })

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

  const productCategoryMap = useMemo(() => {
    const map: Record<number, number | null> = {}
    for (const p of products) {
      map[p.id] = p.categoryId
    }
    return map
  }, [products])

  useEffect(() => {
    if (locationMap === undefined || items.length === 0) return
    const binOccupancy = new Map(
      locationMap.zones.flatMap((z) => z.shelves).flatMap((s) => s.bins).map((b) => [b.id, b.productCount]),
    )
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
    onSuccess: (data) => {
      setReceiptId(data.id)
      setStep(2)
      queryClient.invalidateQueries({ queryKey: ["import-receipts"] })
      toast.success("Tạo phiếu nhập thành công")
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

  const itemsReadyForSubmit = useMemo(
    () => items.length > 0 && items.every((i) => i.serials.length > 0 || i.itemStatus === "NOT_RECEIVED"),
    [items],
  )

  const handleCreate = () => {
    if (!po) return
    createMut.mutate({
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      items: po.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })
  }

  const handleConfirm = () => {
    if (!itemsReadyForSubmit || !receiptId) return
    const missingItems = items.filter((i) => i.serials.length === 0 && i.itemStatus !== "NOT_RECEIVED")
    if (missingItems.length > 0) {
      toast.error(
        `Còn sản phẩm chưa nhập serial và chưa đánh dấu NOT_RECEIVED: ${missingItems.map((i) => i.productName).join(", ")}`,
      )
      return
    }
    const serials = items
      .filter((i) => i.itemStatus === "NORMAL" && i.serials.length > 0)
      .map((i) => ({
        itemId: i.tempId,
        serialNumbers: i.serials,
        locationId: i.locationId ? Number(i.locationId) : null,
      }))
    submitMut.mutate({ receiptId, serials })
  }

  const hasUnsaved = step > 1 && items.some((i) => i.serials.length > 0) && !submitMut.isSuccess

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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/imports")}>
          &larr; Quay lại
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Nhập kho</h1>
        {receiptId && receipt && (
          <span className="text-sm font-mono text-muted-foreground">{receipt.receiptCode}</span>
        )}
      </div>

      <StepIndicator current={step} />

      {/* Step 1: Chọn đơn hàng */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {receiptId ? "Đơn hàng đã chọn" : "Bước 1/3 — Chọn đơn hàng"}
          </h2>

          {!receiptId ? (
            <>
              <div className="max-w-sm space-y-2">
                <Label htmlFor="po">Chọn đơn đặt hàng</Label>
                <Select
                  value={selectedPoId ? String(selectedPoId) : ""}
                  onValueChange={(v) => setSelectedPoId(Number(v))}
                >
                  <SelectTrigger id="po">
                    <SelectValue placeholder="Chọn đơn hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePOs.map((po) => (
                      <SelectItem key={po.id} value={String(po.id)}>
                        {po.poCode} — {po.supplierName}
                      </SelectItem>
                    ))}
                    {availablePOs.length === 0 && (
                      <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                        Không có đơn hàng nào
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {po && (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Mã đơn hàng:</span>
                        <p className="font-medium font-mono">{po.poCode}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Nhà cung cấp:</span>
                        <p className="font-medium">{po.supplierName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Ngày dự kiến:</span>
                        <p className="font-medium">{new Date(po.expectedDate).toLocaleDateString("vi-VN")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Tổng tiền:</span>
                        <p className="font-medium">{Number(po.totalAmount).toLocaleString("vi-VN")}đ</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {po && (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead className="w-24">SKU</TableHead>
                        <TableHead className="w-20 text-right">Số lượng</TableHead>
                        <TableHead className="w-24 text-right">Đơn giá</TableHead>
                        <TableHead className="w-20 text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="font-mono text-xs">{item.productSku ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(item.unitPrice).toLocaleString("vi-VN")}đ
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {Number(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            /* After creation — readonly view when going back from step 2 */
            po && (
              <>
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
                  Đã tạo phiếu nhập từ đơn hàng <span className="font-mono font-medium">{po.poCode}</span>
                </div>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Mã đơn hàng:</span>
                        <p className="font-medium font-mono">{po.poCode}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Nhà cung cấp:</span>
                        <p className="font-medium">{po.supplierName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead className="w-24">SKU</TableHead>
                        <TableHead className="w-20 text-right">Số lượng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="font-mono text-xs">{item.productSku ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* Step 2: Nhập serial */}
      {step === 2 && (
        <>
          {receipt && (
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
          {receiptLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
          {!receiptLoading && (
            <ImportStepSerials
              items={items}
              dispatch={dispatch}
              discrepancyNotes={discrepancyNotes}
              onDiscrepancyNotesChange={setDiscrepancyNotes}
              suggestedLocations={suggestedLocations}
            />
          )}
        </>
      )}

      {/* Step 3: QC & Xác nhận */}
      {step === 3 && (
        <ImportStepQc
          items={items}
          note={note}
          setNote={setNote}
          onQcStatus={(status) => setQcBlocked(status.hasRecords && !status.done)}
          onQcRecordsChange={setQcRecords}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {step > 1 && (!isResume || step > 2) ? (
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
          {!isResume && step === 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button onClick={handleCreate} disabled={!selectedPoId || createMut.isPending}>
                    {createMut.isPending ? "Đang tạo..." : "Tạo phiếu"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!selectedPoId && (
                <TooltipContent side="top" className="text-xs">
                  <p>● Chưa chọn đơn hàng</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)}>
              Tiếp theo <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleConfirm}
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
  )
}
