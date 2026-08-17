import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { disposeConfirmUnits, getQcUnits, qcPassUnits } from "@/services/qc-processing-service"
import { getSuppliers } from "@/services/supplier-service"
import { invalidateDashboard } from "@/hooks/use-reports"
import { unitStatusInfo } from "@/utils/labels"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { AlertTriangle, CheckCircle2, RefreshCw, Search, Send, Trash2, Undo2 } from "lucide-react"
import { toast } from "@/utils/toast"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { PRODUCT_UNIT_STATUS, type ProductUnitStatus, type QcUnit } from "@/utils/types"

const PAGE_SIZE = 20

const QC_PASS_STATUSES: ProductUnitStatus[] = [
  PRODUCT_UNIT_STATUS.RETURN_QC_HOLD,
  PRODUCT_UNIT_STATUS.RMA_REPAIRED_RETURNED,
]
const DISPOSE_STATUSES: ProductUnitStatus[] = [
  PRODUCT_UNIT_STATUS.PENDING_DISPOSAL,
  PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE,
  PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT,
  PRODUCT_UNIT_STATUS.REJECTED_RETURN,
]
const DONE_STATUSES: ProductUnitStatus[] = [
  PRODUCT_UNIT_STATUS.DISPOSED,
  PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER,
  PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER,
]

export const QcProcessingPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()
  const canOperate = perm.hasRole(...ROLES.CAN_OPERATE_STOCK)

  const [passSelected, setPassSelected] = useState<number[]>([])
  const [passConfirmOpen, setPassConfirmOpen] = useState(false)
  const [disposeSelected, setDisposeSelected] = useState<number[]>([])
  const [confirmAction, setConfirmAction] = useState<"DISPOSED" | "RETURN" | "SEND_WARRANTY" | "PENDING_DISPOSAL" | "RETURN_QC_HOLD" | null>(null)
  const [supplierId, setSupplierId] = useState("")
  const [disposeNote, setDisposeNote] = useState("")
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState("pass")
  const [page, setPage] = useState(0)

  useEffect(() => {
    setSupplierId("")
    setDisposeNote("")
  }, [confirmAction])

  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  })

  const passUnits = useQuery({
    queryKey: ["qc-processing", QC_PASS_STATUSES.join(",")],
    queryFn: () => getQcUnits(QC_PASS_STATUSES),
  })
  const disposeUnits = useQuery({
    queryKey: ["qc-processing", DISPOSE_STATUSES.join(",")],
    queryFn: () => getQcUnits(DISPOSE_STATUSES),
  })
  const doneUnits = useQuery({
    queryKey: ["qc-processing", DONE_STATUSES.join(",")],
    queryFn: () => getQcUnits(DONE_STATUSES),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["qc-processing"] })
    qc.invalidateQueries({ queryKey: ["inventory"] })
    qc.invalidateQueries({ queryKey: ["work-queue"] })
    invalidateDashboard(qc)
  }

  const passMut = useMutation({
    mutationFn: qcPassUnits,
    onSuccess: () => {
      toast.success(t("qcPage.passSuccess", { count: passSelected.length }))
      setPassSelected([])
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const disposeMut = useMutation({
    mutationFn: (action: string) =>
      disposeConfirmUnits(disposeSelected, action, supplierId ? Number(supplierId) : null, disposeNote.trim() || undefined),
    onSuccess: (res) => {
      if (res?.receiptCode && res.exportReceiptId != null) {
        toast.success(t("qcPage.disposeExportCreated", { code: res.receiptCode }), {
          action: {
            label: t("common.viewDetail"),
            onClick: () => navigate(`/stock/exports/${res.exportReceiptId}`),
          },
        })
      } else {
        toast.success(t("qcPage.disposeSuccess"))
      }
      setDisposeSelected([])
      setConfirmAction(null)
      setSupplierId("")
      setDisposeNote("")
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = (selected: number[], setSelected: (v: number[]) => void, id: number) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const toggleAll = (selected: number[], setSelected: (v: number[]) => void, units: QcUnit[]) => {
    const allSelected = units.length > 0 && units.every((u) => selected.includes(u.id))
    setSelected(
      allSelected
        ? selected.filter((id) => !units.some((u) => u.id === id))
        : [...new Set([...selected, ...units.map((u) => u.id)])],
    )
  }

  const TableSkeleton = () => (
    <div className="rounded-lg border overflow-x-auto">
      <div className="h-9 bg-muted/50 border-b" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b last:border-0 px-3 py-3">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )

  const statusBadge = (status: ProductUnitStatus) => {
    const s = unitStatusInfo(status)
    return <Badge variant={s.variant}>{t(s.labelKey)}</Badge>
  }

  const disposeReturnTarget = (unit: QcUnit) =>
    unit.status === PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE
      ? PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER
      : PRODUCT_UNIT_STATUS.REJECTED_RETURN

  const renderRows = (
    units: QcUnit[] | undefined,
    selected: number[],
    setSelected: (v: number[]) => void,
    selectable: boolean,
  ) => {
    const q = search.trim().toLowerCase()
    const filtered = units?.filter(
      (u) =>
        !q ||
        (u.serialNumber ?? `#${u.id}`).toLowerCase().includes(q) ||
        (u.productName ?? "").toLowerCase().includes(q),
    )
    if (!filtered || filtered.length === 0) {
      return (
        <Empty>
          <EmptyTitle>{t("qcPage.empty")}</EmptyTitle>
          <EmptyDescription>{t("qcPage.emptyDescription")}</EmptyDescription>
        </Empty>
      )
    }
    const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
    const safePage = Math.min(page, pageCount - 1)
    const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
    const allOnPageSelected = paged.every((u) => selected.includes(u.id))
    const someOnPageSelected = paged.some((u) => selected.includes(u.id))
    return (
      <div className="space-y-2">
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-3 py-2">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected
                      }}
                      disabled={!canOperate}
                      onChange={() => toggleAll(selected, setSelected, paged)}
                      className="size-4"
                    />
                  )}
                </th>
              <th className="px-3 py-2 font-medium">{t("table.product")}</th>
              <th className="px-3 py-2 font-medium">{t("table.serial")}</th>
              <th className="px-3 py-2 font-medium">{t("table.status")}</th>
              <th className="px-3 py-2 font-medium">{t("table.location")}</th>
              {!selectable && (
                <>
                  <th className="px-3 py-2 font-medium">{t("qcPage.exportCode")}</th>
                  <th className="px-3 py-2 font-medium">{t("qcPage.rejectReason")}</th>
                  <th className="px-3 py-2 font-medium">{t("qcPage.processedBy")}</th>
                  <th className="px-3 py-2 font-medium">{t("qcPage.processedAt")}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((unit) => {
              const checked = selected.includes(unit.id)
              return (
                <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2">
                    {selectable && (
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canOperate}
                        onChange={() => toggle(selected, setSelected, unit.id)}
                        className="size-4"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{unit.productName}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">{unit.serialNumber ?? `#${unit.id}`}</span>
                  </td>
                  <td className="px-3 py-2">{statusBadge(unit.status)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{unit.locationFullCode ?? "—"}</td>
                  {!selectable && (
                    <>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {unit.exportReceiptCode ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[180px] truncate">
                        {unit.description ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {unit.processedByName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {unit.processedAt
                          ? new Date(unit.processedAt).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        {pageCount > 1 && <PaginationBar page={safePage} totalPages={pageCount} onChange={setPage} />}
      </div>
    )
  }

  const loadErrorBox = (retry: () => void) => (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center space-y-2">
      <p className="text-sm text-destructive">{t("qcPage.loadError")}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RefreshCw className="size-3 mr-1" /> {t("qcPage.retry")}
      </Button>
    </div>
  )

  const hasMixedReturnTargets = (units: QcUnit[] | undefined, selected: number[]) =>
    selected.length > 0 &&
    new Set((units ?? []).filter((u) => selected.includes(u.id)).map((u) => disposeReturnTarget(u))).size > 1

  const allSelectedWaitingRma = (units: QcUnit[] | undefined, selected: number[]) =>
    selected.length > 0 &&
    (units ?? []).filter((u) => selected.includes(u.id)).every((u) => u.status === PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT)

  const allRejectedReturn = (units: QcUnit[] | undefined, selected: number[]) =>
    selected.length > 0 &&
    (units ?? []).filter((u) => selected.includes(u.id)).every((u) => u.status === PRODUCT_UNIT_STATUS.REJECTED_RETURN)

  const anyRejectedReturn = (units: QcUnit[] | undefined, selected: number[]) =>
    selected.length > 0 &&
    (units ?? []).some((u) => selected.includes(u.id) && u.status === PRODUCT_UNIT_STATUS.REJECTED_RETURN)

  const hasWaitingRma = (units: QcUnit[] | undefined, selected: number[]) =>
    selected.length > 0 &&
    (units ?? []).some((u) => selected.includes(u.id) && u.status === PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT)

  const returnTargetKey = (units: QcUnit[] | undefined, selected: number[]) => {
    const first = (units ?? []).find((u) => selected.includes(u.id))
    return first && disposeReturnTarget(first) === PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER
      ? "returnSupplier"
      : "returnCustomer"
  }

  const disposeBlockReason = (() => {
    if (disposeSelected.length === 0) return null
    if (hasWaitingRma(disposeUnits.data, disposeSelected)) return t("qcPage.hintBlockedRma")
    if (anyRejectedReturn(disposeUnits.data, disposeSelected)) return t("qcPage.hintBlockedRejected")
    if (hasMixedReturnTargets(disposeUnits.data, disposeSelected)) return t("qcPage.hintBlockedMixed")
    return null
  })()

  const needsSupplier =
    (confirmAction === "RETURN" &&
      disposeUnits.data?.find((u) => disposeSelected.includes(u.id))?.status === PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE) ||
    confirmAction === "SEND_WARRANTY"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("nav.qcProcessing")}</h1>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder={t("qcPage.searchPlaceholder")}
            className="w-64 pl-8"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(0) }}>
        <TabsList>
          <TabsTrigger value="pass">
            {t("qcPage.tabQcPass")}
            {!!passUnits.data?.length && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {passUnits.data.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="dispose">
            {t("qcPage.tabDispose")}
            {!!disposeUnits.data?.length && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {disposeUnits.data.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="done">
            {t("qcPage.tabDone")}
            {!!doneUnits.data?.length && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {doneUnits.data.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pass" className="space-y-3 pt-2">
          {passUnits.isPending ? <TableSkeleton /> : passUnits.isError ? loadErrorBox(passUnits.refetch) : renderRows(passUnits.data, passSelected, setPassSelected, true)}
          {canOperate && (
            <div className="sticky bottom-3 z-10 flex justify-end rounded-lg border bg-background/95 p-2 shadow-sm">
              <Button
                onClick={() => setPassConfirmOpen(true)}
                disabled={passSelected.length === 0 || passMut.isPending}
              >
                <CheckCircle2 className="size-4 mr-1.5" />
                {passMut.isPending ? t("common.processing") : t("qcPage.qcPass", { count: passSelected.length })}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="done" className="space-y-3 pt-2">
          {doneUnits.isPending ? <TableSkeleton /> : doneUnits.isError ? loadErrorBox(doneUnits.refetch) : renderRows(doneUnits.data, [], () => {}, false)}
        </TabsContent>

        <TabsContent value="dispose" className="space-y-3 pt-2">
          {disposeUnits.isPending ? <TableSkeleton /> : disposeUnits.isError ? loadErrorBox(disposeUnits.refetch) : renderRows(disposeUnits.data, disposeSelected, setDisposeSelected, true)}
          {disposeBlockReason && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="size-3.5 shrink-0" /> {disposeBlockReason}
            </p>
          )}
          {canOperate && (
          <div className="sticky bottom-3 z-10 flex justify-end gap-2 rounded-lg border bg-background/95 p-2 shadow-sm">
            <Button
              variant="destructive"
              onClick={() => {
                setSupplierId("")
                setConfirmAction("DISPOSED")
              }}
              disabled={
                disposeSelected.length === 0 ||
                hasWaitingRma(disposeUnits.data, disposeSelected) ||
                anyRejectedReturn(disposeUnits.data, disposeSelected) ||
                disposeMut.isPending
              }
            >
              <Trash2 className="size-4 mr-1.5" />
              {t("qcPage.dispose", { count: disposeSelected.length })}
            </Button>
            {allRejectedReturn(disposeUnits.data, disposeSelected) && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSupplierId("")
                    setConfirmAction("RETURN_QC_HOLD")
                  }}
                  disabled={disposeMut.isPending}
                >
                  <Undo2 className="size-4 mr-1.5" />
                  {t("qcPage.toQcHold", { count: disposeSelected.length })}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSupplierId("")
                    setConfirmAction("PENDING_DISPOSAL")
                  }}
                  disabled={disposeMut.isPending}
                >
                  <Trash2 className="size-4 mr-1.5" />
                  {t("qcPage.toPendingDisposal", { count: disposeSelected.length })}
                </Button>
              </>
            )}
            {allSelectedWaitingRma(disposeUnits.data, disposeSelected) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSupplierId("")
                  setConfirmAction("SEND_WARRANTY")
                }}
                disabled={disposeMut.isPending}
              >
                <Send className="size-4 mr-1.5" />
                {t("qcPage.sendWarranty", { count: disposeSelected.length })}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setSupplierId("")
                setConfirmAction("RETURN")
              }}
              disabled={
                disposeSelected.length === 0 ||
                hasWaitingRma(disposeUnits.data, disposeSelected) ||
                anyRejectedReturn(disposeUnits.data, disposeSelected) ||
                hasMixedReturnTargets(disposeUnits.data, disposeSelected) ||
                disposeMut.isPending
              }
            >
              <Undo2 className="size-4 mr-1.5" />
              {t(`qcPage.${returnTargetKey(disposeUnits.data, disposeSelected)}`, { count: disposeSelected.length })}
            </Button>
          </div>
          )}
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
              <p className="flex items-center gap-2">
                <Badge variant="outline">PENDING_DISPOSAL</Badge>
                {t("qcPage.hintPending")}
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline">{PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE}</Badge>
                {t("qcPage.hintRma")}
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline">{PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT}</Badge>
                {t("qcPage.hintWaitingRma")}
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline">{PRODUCT_UNIT_STATUS.REJECTED_RETURN}</Badge>
                {t("qcPage.hintRejected")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {passConfirmOpen && (
        <Dialog open={passConfirmOpen} onOpenChange={(v) => { if (!v) setPassConfirmOpen(false) }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("qcPage.passConfirmTitle")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t("qcPage.passConfirmDesc")}</p>
            <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1 text-xs">
              {(passUnits.data ?? [])
                .filter((u) => passSelected.includes(u.id))
                .map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2">
                    <span className="font-mono">{u.serialNumber ?? `#${u.id}`}</span>
                    <span className="truncate text-muted-foreground">{u.productName}</span>
                  </div>
                ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPassConfirmOpen(false)}>
                {t("dialog.cancel")}
              </Button>
              <Button
                onClick={() => {
                  setPassConfirmOpen(false)
                  passMut.mutate(passSelected)
                }}
                disabled={passMut.isPending}
              >
                {passMut.isPending ? t("common.processing") : t("dialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {confirmAction && (
        <Dialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null) }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {confirmAction === "DISPOSED"
                  ? t("qcPage.disposeConfirmTitle")
                  : confirmAction === "SEND_WARRANTY"
                    ? t("qcPage.sendWarrantyConfirmTitle")
                    : confirmAction === "RETURN_QC_HOLD"
                      ? t("qcPage.qcHoldConfirmTitle")
                      : confirmAction === "PENDING_DISPOSAL"
                        ? t("qcPage.pendingDisposalConfirmTitle")
                        : t(`qcPage.${returnTargetKey(disposeUnits.data, disposeSelected)}ConfirmTitle`)}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {confirmAction === "DISPOSED"
                ? t("qcPage.disposeConfirmDesc")
                : confirmAction === "SEND_WARRANTY"
                  ? t("qcPage.sendWarrantyConfirmDesc")
                  : confirmAction === "RETURN_QC_HOLD"
                    ? t("qcPage.qcHoldConfirmDesc")
                    : confirmAction === "PENDING_DISPOSAL"
                      ? t("qcPage.pendingDisposalConfirmDesc")
                      : t(`qcPage.${returnTargetKey(disposeUnits.data, disposeSelected)}ConfirmDesc`)}
            </p>
            <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1 text-xs">
              {(disposeUnits.data ?? [])
                .filter((u) => disposeSelected.includes(u.id))
                .map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2">
                    <span className="font-mono">{u.serialNumber ?? `#${u.id}`}</span>
                    <span className="truncate text-muted-foreground">{u.productName}</span>
                  </div>
                ))}
            </div>
            {confirmAction === "RETURN" &&
              disposeUnits.data?.find((u) => disposeSelected.includes(u.id))?.status ===
                PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE && (
                <div className="space-y-2">
                  <Label htmlFor="return-supplier">{t("qcPage.supplier")}</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger id="return-supplier">
                      <SelectValue placeholder={t("qcPage.supplierPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[50vh]">
                      {(suppliers.data ?? []).map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            {confirmAction === "SEND_WARRANTY" && (
              <div className="space-y-2">
                <Label htmlFor="send-supplier">{t("qcPage.supplier")}</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="send-supplier">
                    <SelectValue placeholder={t("qcPage.supplierPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[50vh]">
                    {(suppliers.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dispose-note">{t("qcPage.disposeNote")}</Label>
              <Textarea
                id="dispose-note"
                value={disposeNote}
                onChange={(e) => setDisposeNote(e.target.value)}
                placeholder={t("qcPage.disposeNotePlaceholder")}
                rows={2}
                className="text-xs"
              />
            </div>
            {needsSupplier && !supplierId && (
              <p className="text-xs text-destructive">{t("qcPage.supplierRequired")}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                {t("dialog.cancel")}
              </Button>
              <Button
                variant={confirmAction === "DISPOSED" ? "destructive" : "default"}
                onClick={() =>
                  confirmAction === "DISPOSED"
                    ? disposeMut.mutate("DISPOSED")
                    : confirmAction === "SEND_WARRANTY"
                      ? disposeMut.mutate(PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER)
                      : confirmAction === "RETURN_QC_HOLD"
                        ? disposeMut.mutate(PRODUCT_UNIT_STATUS.RETURN_QC_HOLD)
                        : confirmAction === "PENDING_DISPOSAL"
                          ? disposeMut.mutate(PRODUCT_UNIT_STATUS.PENDING_DISPOSAL)
                          : disposeMut.mutate(
                              disposeUnits.data?.find((u) => disposeSelected.includes(u.id))?.status ===
                                PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE
                                ? PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER
                                : PRODUCT_UNIT_STATUS.REJECTED_RETURN,
                            )
                }
                disabled={disposeMut.isPending || (needsSupplier && !supplierId)}
              >
                {disposeMut.isPending ? t("common.processing") : t("dialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
