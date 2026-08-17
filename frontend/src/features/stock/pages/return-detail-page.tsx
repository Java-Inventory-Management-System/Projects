import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getReturnReceiptById, approveReturnReceipt, cancelReturnReceipt, getWarrantyExchangeInfo, warrantyExchange } from "@/services/return-service"
import { getDefectCategories } from "@/services/defect-category-service"
import { getProducts } from "@/services/product-service"
import { getProductUnits } from "@/services/product-unit-service"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { formatMoney, formatDateVN } from "@/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Check, X, ExternalLink, Circle, RefreshCcw } from "lucide-react"
import { PrintReceiptButton } from "../components/print-receipt"
import { toast } from "@/utils/toast"
import { RETURN_RECEIPT_STATUS } from "@/utils/types"
import { cn } from "@/utils/cn"
import { useTranslation } from "react-i18next"

export const ReturnDetailPage = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [showCancel, setShowCancel] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [showExchange, setShowExchange] = useState(false)
  const [exchangeProductId, setExchangeProductId] = useState<number | "">("")
  const [exchangeUnitId, setExchangeUnitId] = useState<number | "">("")
  const [exchangeDiscount, setExchangeDiscount] = useState("")
  const [exchangeNote, setExchangeNote] = useState("")
  const [productQuery, setProductQuery] = useState("")
  const [productOpen, setProductOpen] = useState(false)
  const [unitQuery, setUnitQuery] = useState("")
  const [unitOpen, setUnitOpen] = useState(false)

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["return-receipt", id],
    queryFn: () => getReturnReceiptById(Number(id)),
    enabled: !!id,
  })

  const { data: defectCategories = [] } = useQuery({
    queryKey: ["defect-categories"],
    queryFn: getDefectCategories,
  })

  const defectName = (id: number | null) =>
    id ? defectCategories.find((d) => d.id === id)?.name ?? null : null

  const { data: exchangeInfo, isError: exchangeInfoError } = useQuery({
    queryKey: ["warranty-exchange-info", id],
    queryFn: () => getWarrantyExchangeInfo(Number(id)),
    enabled: !!id,
    retry: false,
  })

  const { data: productsPage, isPending: productsPending } = useQuery({
    queryKey: ["products", "exchange", productQuery],
    queryFn: () => getProducts(0, 50, undefined, productQuery.trim() || undefined),
    enabled: showExchange,
  })
  const products = productsPage?.content ?? []

  const { data: unitsPage } = useQuery({
    queryKey: ["product-units", "IN_STOCK", exchangeProductId],
    queryFn: () =>
      getProductUnits(0, 100, "importedAt,desc", undefined, "IN_STOCK", exchangeProductId === "" ? undefined : Number(exchangeProductId)),
    enabled: showExchange && exchangeProductId !== "",
  })
  const exchangeUnits = (unitsPage?.content ?? []).filter((u) => u.boxId === null && u.status === "IN_STOCK")
  const filteredUnits = exchangeUnits.filter(
    (u) => !unitQuery.trim() || u.serialNumber.toLowerCase().includes(unitQuery.trim().toLowerCase()),
  )

  const selectedProduct = products.find((p) => p.id === exchangeProductId)
  const originalPrice = exchangeInfo?.originalSellPrice ?? 0
  const priceDiff = selectedProduct ? Math.max(0, selectedProduct.sellPrice - originalPrice) : 0
  const discount = Math.min(Math.max(0, Number(exchangeDiscount) || 0), priceDiff)
  const charge = Math.max(0, priceDiff - discount)

  const exchangeMut = useMutation({
    mutationFn: () =>
      warrantyExchange(Number(id!), {
        replacementUnitId: Number(exchangeUnitId),
        discountAmount: discount > 0 ? discount : undefined,
        note: exchangeNote.trim() || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["return-receipt", id] })
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["product-units"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      setShowExchange(false)
      setExchangeUnitId("")
      setExchangeDiscount("")
      setExchangeNote("")
      const msg = t("returnDetail.exchangeSuccess")
      if (data?.exportReceiptId) {
        toast.success(msg, {
          action: {
            label: t("returnDetail.viewExport"),
            onClick: () => navigate(`/stock/exports/${data.exportReceiptId}`),
          },
        })
      } else {
        toast.success(msg)
      }
    },
    onError: (err: Error) => toast.error(err.message || t("returnDetail.exchangeFail")),
  })

  const approveMut = useMutation({
    mutationFn: () => approveReturnReceipt(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["return-receipt", id] })
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      setShowApprove(false)
      toast.success(t("returnDetail.approveSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("returnDetail.approveFail")),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelReturnReceipt(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["return-receipt", id] })
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      setShowCancel(false)
      toast.success(t("returnDetail.cancelSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("returnDetail.cancelFail")),
  })

  const reasonLabel: Record<string, string> = {
    CHANGE_MIND: t("returnReason.changeMind"),
    DEFECTIVE: t("returnReason.defective"),
    WRONG_ITEM: t("returnReason.wrongItem"),
    WARRANTY_CLAIM: t("returnReason.warrantyClaim"),
  }

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    PENDING_APPROVAL: { label: t("returnStatus.pendingApproval"), variant: "secondary" },
    COMPLETED: { label: t("returnStatus.completed"), variant: "default" },
    CANCELLED: { label: t("returnStatus.cancelled"), variant: "destructive" },
  }

  const conditionLabel: Record<string, string> = {
    GOOD: t("returnCondition.good"),
    DEFECTIVE: t("returnCondition.defective"),
  }

  const actionLabel: Record<string, string> = {
    RESTOCK: t("returnAction.restock"),
    SCRAP: t("returnAction.scrap"),
    REJECT: t("returnAction.reject"),
    WARRANTY_TRANSFER: t("returnAction.warrantyTransfer"),
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )

  if (!receipt)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty>
          <EmptyTitle>{t("returnDetail.notFound")}</EmptyTitle>
        </Empty>
      </div>
    )

  const st = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" as const }
  const isCreator = receipt.createdBy === perm.user?.id
  const canApprove =
    receipt.status === RETURN_RECEIPT_STATUS.PENDING_APPROVAL &&
    !isCreator &&
    perm.hasRole(...ROLES.CAN_APPROVE)
  const canCancel =
    receipt.status === RETURN_RECEIPT_STATUS.PENDING_APPROVAL &&
    !isCreator &&
    perm.hasRole(...ROLES.CAN_APPROVE)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/returns-qc/returns")}>{t("returnDetail.breadcrumb")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{receipt.receiptCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Badge variant={st.variant}>{st.label}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{receipt.receiptCode}</span>
      </div>

      <div className="flex items-start gap-6 px-1 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Circle className={cn("size-3 fill-current", receipt.status !== RETURN_RECEIPT_STATUS.CANCELLED ? "text-blue-500" : "text-muted-foreground")} />
          <div>
            <p className="font-medium">{t("returnDetail.createReceipt")}</p>
            <p className="text-muted-foreground">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
            <p className="text-muted-foreground">{receipt.createdByName}</p>
          </div>
        </div>
        <div className="w-6 border-t border-muted-foreground/30 mt-3" />
        <div className="flex items-center gap-2">
          <Circle className={cn("size-3 fill-current", receipt.status === RETURN_RECEIPT_STATUS.COMPLETED ? "text-green-500" : receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? "text-red-500" : "text-muted-foreground")} />
          <div>
            <p className="font-medium">{receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? t("returnStatus.cancelled") : t("returnDetail.approve")}</p>
            {receipt.approvedAt ? (
              <>
                <p className="text-muted-foreground">{new Date(receipt.approvedAt).toLocaleString("vi-VN")}</p>
                <p className="text-muted-foreground">{receipt.approvedByName}</p>
              </>
            ) : (
              <p className="text-muted-foreground italic">{receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? "" : t("returnStatus.pendingApproval")}</p>
            )}
          </div>
        </div>
      </div>

      {receipt.status === RETURN_RECEIPT_STATUS.PENDING_APPROVAL && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-3">
          <RefreshCcw className="size-3 shrink-0" /> {t("returnDetail.exchangeGuide")}
        </p>
      )}

      <div className="rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{t("label.customer")}</span>
            <p className="font-medium mt-0.5">{receipt.customerName ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("table.reason")}</span>
            <p className="font-medium mt-0.5">{reasonLabel[receipt.reason] ?? receipt.reason}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("returnDetail.originalExport")}</span>
            <p className="font-mono text-xs mt-0.5">
              {receipt.originalExportReceiptId
                ? <a className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(`/stock/exports/${receipt.originalExportReceiptId}`)}>
                    <ExternalLink className="size-3" /> #{receipt.originalExportReceiptId}
                  </a>
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("label.createdDate")}</span>
            <p className="mt-0.5">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("label.creator")}</span>
            <p className="font-medium mt-0.5">{receipt.createdByName}</p>
          </div>
          {receipt.approvedByName && (
            <div>
              <span className="text-muted-foreground">{t("label.approver")}</span>
              <p className="font-medium mt-0.5">{receipt.approvedByName}</p>
            </div>
          )}
        </div>

        {receipt.note && (
          <div>
            <span className="text-sm text-muted-foreground">{t("returnDetail.note")}</span>
            <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{receipt.note}</p>
          </div>
        )}

        <Separator />
        <div className="space-y-2">
          <span className="text-sm font-medium">{t("returnDetail.returnProducts", { count: receipt.items.length })}</span>
          <div className="rounded-lg border divide-y text-sm">
            {receipt.items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.productName ?? `Product #${item.productId}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.serialNumber && <span className="font-mono">{item.serialNumber}</span>}
                    {item.productSku && <span className="ml-2">SKU: {item.productSku}</span>}
                    <span className="ml-2">x{item.quantity}</span>
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {conditionLabel[item.condition] ?? item.condition}
                </Badge>
                {defectName(item.defectCategoryId) && (
                  <Badge variant="secondary" className="text-xs">
                    {defectName(item.defectCategoryId)}
                  </Badge>
                )}
                <Badge className="text-xs">{actionLabel[item.resultingAction] ?? item.resultingAction}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <PrintReceiptButton id={receipt.id} type="return" label={t("returnDetail.print")} />
        {canCancel && (
          <Button variant="outline" className="text-destructive" onClick={() => setShowCancel(true)}>
            <X className="size-4 mr-1" /> {t("returnDetail.cancelReceipt")}
          </Button>
        )}
        {canApprove && (
          <span
            title={
              exchangeInfoError
                ? t("returnDetail.exchangeUnavailable")
                : exchangeInfo && !exchangeInfo.replaceable
                  ? t("returnDetail.exchangeNotReplaceable")
                  : undefined
            }
          >
            <Button
              variant="outline"
              onClick={() => setShowExchange(true)}
              disabled={exchangeInfoError || (exchangeInfo ? !exchangeInfo.replaceable : false) || exchangeMut.isPending}
            >
              <RefreshCcw className="size-4 mr-1" /> {t("returnDetail.exchange1to1")}
            </Button>
          </span>
        )}
        {canApprove && (
          <Button onClick={() => setShowApprove(true)} disabled={approveMut.isPending}>
            <Check className="size-4 mr-1" /> {t("returnDetail.approve")}
          </Button>
        )}
      </div>

      <Dialog open={showApprove} onOpenChange={(v) => { if (!v) setShowApprove(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("returnDetail.approveDialogTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("returnDetail.approveDialogDesc", { code: receipt.receiptCode })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(false)}>
              {t("dialog.back")}
            </Button>
            <Button onClick={() => { setShowApprove(false); approveMut.mutate() }} disabled={approveMut.isPending}>
              {approveMut.isPending ? t("returnDetail.approving") : t("dialog.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCancel}
        onOpenChange={(v) => {
          if (!v) setShowCancel(false)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("returnDetail.cancelDialogTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("returnDetail.cancelDialogDesc")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              {t("dialog.back")}
            </Button>
            <Button variant="destructive" onClick={() => { setShowCancel(false); cancelMut.mutate() }} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? t("returnDetail.cancelling") : t("returnDetail.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExchange} onOpenChange={(v) => { if (!v) setShowExchange(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("returnDetail.exchangeDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {exchangeInfo && (
              <div className="space-y-1 rounded-md border bg-muted/20 px-4 py-3">
                <p>
                  {t("returnDetail.exchangeOriginal")}{" "}
                  <span className="font-mono">{exchangeInfo.serialNumber ?? "—"}</span>
                </p>
                <p>
                  {t("returnDetail.exchangeOriginalPrice")}: <b>{formatMoney(originalPrice)}</b>{" "}
                  · {t("returnDetail.exchangeWarranty")}:{" "}
                  {exchangeInfo.warrantyExpiresAt ? formatDateVN(exchangeInfo.warrantyExpiresAt) : "—"}
                </p>
                {exchangeInfo.defectName && <p className="text-muted-foreground">{exchangeInfo.defectName}</p>}
                {!exchangeInfo.replaceable && (
                  <p className="text-destructive text-xs">{t("returnDetail.exchangeNotReplaceable")}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("returnDetail.exchangeProduct")}</Label>
              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setProductOpen(false)
                }}
              >
                <Input
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value)
                    setExchangeProductId("")
                    setExchangeUnitId("")
                    setProductOpen(true)
                  }}
                  onFocus={() => setProductOpen(true)}
                  placeholder={t("returnDetail.exchangeSelectProduct")}
                  disabled={exchangeInfo ? !exchangeInfo.replaceable : false}
                />
                {productOpen && exchangeProductId === "" && (
                  <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-background shadow-sm divide-y text-sm">
                    {productsPending ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t("common.loading")}</div>
                    ) : products.length > 0 ? (
                      products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-muted/30"
                          onClick={() => {
                            setExchangeProductId(p.id)
                            setProductQuery(p.name)
                            setProductOpen(false)
                            setExchangeUnitId("")
                          }}
                        >
                          <span className="truncate font-medium">{p.name}</span>
                          {p.sku && <span className="shrink-0 text-xs text-muted-foreground">{p.sku}</span>}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t("common.noResults")}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {exchangeProductId !== "" && (
              <div className="space-y-1.5">
                <Label>{t("returnDetail.exchangeUnit")}</Label>
                <div
                  className="relative"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setUnitOpen(false)
                  }}
                >
                  <Input
                    value={unitQuery}
                    onChange={(e) => {
                      setUnitQuery(e.target.value)
                      setExchangeUnitId("")
                    }}
                    onFocus={() => setUnitOpen(true)}
                    placeholder={
                      exchangeUnits.length === 0 ? t("returnDetail.exchangeNoStock") : t("returnDetail.exchangeSelectUnit")
                    }
                    disabled={exchangeUnits.length === 0}
                  />
                  {unitOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-background shadow-sm divide-y text-sm">
                      {filteredUnits.length > 0 ? (
                        filteredUnits.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/30"
                            onClick={() => {
                              setExchangeUnitId(u.id)
                              setUnitQuery(u.serialNumber)
                              setUnitOpen(false)
                            }}
                          >
                            <span className="font-mono text-xs shrink-0">{u.serialNumber}</span>
                            <span className="flex-1 truncate text-xs text-muted-foreground">{u.locationCode ?? "—"}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatMoney(selectedProduct?.sellPrice ?? 0)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-muted-foreground">{t("returnDetail.exchangeNoStock")}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedProduct && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("returnDetail.exchangeDiscount")}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={priceDiff}
                    value={exchangeDiscount}
                    onChange={(e) => setExchangeDiscount(e.target.value)}
                    placeholder="0"
                  />
                  {priceDiff > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("returnDetail.exchangeMaxDiscount", { amount: formatMoney(priceDiff) })}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("returnDetail.exchangeCharge")}</Label>
                  <p className="py-2 font-semibold">
                    {formatMoney(charge)}
                    {priceDiff > 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t("returnDetail.exchangeDiff")}: {formatMoney(priceDiff)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("returnDetail.exchangeNote")}</Label>
              <Input
                value={exchangeNote}
                onChange={(e) => setExchangeNote(e.target.value)}
                placeholder={t("returnDetail.exchangeNotePlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExchange(false)}>
              {t("dialog.back")}
            </Button>
            <Button
              disabled={!exchangeUnitId || !exchangeInfo?.replaceable || exchangeMut.isPending}
              onClick={() => exchangeMut.mutate()}
            >
              {exchangeMut.isPending ? t("returnDetail.exchanging") : t("returnDetail.exchangeConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
