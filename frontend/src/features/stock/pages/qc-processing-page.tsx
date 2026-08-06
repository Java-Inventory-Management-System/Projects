import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { disposeConfirmUnits, getQcUnits, qcPassUnits } from "@/services/qc-processing-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, Send, Trash2, Undo2 } from "lucide-react"
import { toast } from "@/utils/toast"
import { PRODUCT_UNIT_STATUS, type ProductUnitStatus, type QcUnit } from "@/utils/types"

const QC_PASS_STATUSES: ProductUnitStatus[] = [
  PRODUCT_UNIT_STATUS.RETURN_QC_HOLD,
  PRODUCT_UNIT_STATUS.RMA_REPAIRED_RETURNED,
]
const DISPOSE_STATUSES: ProductUnitStatus[] = [
  PRODUCT_UNIT_STATUS.PENDING_DISPOSAL,
  PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE,
  PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT,
]
const DONE_STATUSES: ProductUnitStatus[] = [
  PRODUCT_UNIT_STATUS.DISPOSED,
  PRODUCT_UNIT_STATUS.REJECTED_RETURN,
  PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER,
  PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER,
]

export const QcProcessingPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()

  useEffect(() => {
    localStorage.setItem("qc-tab-visits", String(Number(localStorage.getItem("qc-tab-visits") ?? 0) + 1))
  }, [])

  const [passSelected, setPassSelected] = useState<number[]>([])
  const [disposeSelected, setDisposeSelected] = useState<number[]>([])
  const [confirmAction, setConfirmAction] = useState<"DISPOSED" | "RETURN" | "SEND_WARRANTY" | null>(null)

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
    qc.invalidateQueries({ queryKey: ["inventory-summary"] })
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
    mutationFn: (action: string) => disposeConfirmUnits(disposeSelected, action),
    onSuccess: () => {
      toast.success(t("qcPage.disposeSuccess"))
      setDisposeSelected([])
      setConfirmAction(null)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = (selected: number[], setSelected: (v: number[]) => void, id: number) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const statusBadge = (status: ProductUnitStatus) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      RETURN_QC_HOLD: { label: t("unitStatus.returnQcHold"), variant: "outline" },
      RMA_REPAIRED_RETURNED: { label: t("unitStatus.rmaRepairedReturned"), variant: "secondary" },
      PENDING_DISPOSAL: { label: t("unitStatus.pendingDisposal"), variant: "destructive" },
      RMA_UNREPAIRABLE: { label: t("unitStatus.rmaUnrepairable"), variant: "destructive" },
      WAITING_RMA_EXPORT: { label: t("unitStatus.waitingRmaExport"), variant: "secondary" },
      SENT_TO_MANUFACTURER: { label: t("unitStatus.sentToManufacturer"), variant: "secondary" },
    }
    const s = map[status] ?? { label: status, variant: "outline" as const }
    return <Badge variant={s.variant}>{s.label}</Badge>
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
    if (!units || units.length === 0) {
      return (
        <Empty>
          <EmptyTitle>{t("qcPage.empty")}</EmptyTitle>
          <EmptyDescription>{t("qcPage.emptyDescription")}</EmptyDescription>
        </Empty>
      )
    }
    return (
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-3 py-2" />
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
            {units.map((unit) => {
              const checked = selected.includes(unit.id)
              return (
                <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2">
                    {selectable && (
                      <input
                        type="checkbox"
                        checked={checked}
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
    )
  }

  const hasMixedReturnTargets = (units: QcUnit[] | undefined, selected: number[]) =>
    selected.length > 0 &&
    new Set((units ?? []).filter((u) => selected.includes(u.id)).map((u) => disposeReturnTarget(u))).size > 1

  const allSelectedWaitingRma = (units: QcUnit[] | undefined, selected: number[]) =>
    selected.length > 0 &&
    (units ?? []).filter((u) => selected.includes(u.id)).every((u) => u.status === PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT)

  const returnTargetKey = (units: QcUnit[] | undefined, selected: number[]) => {
    const first = (units ?? []).find((u) => selected.includes(u.id))
    return first && disposeReturnTarget(first) === PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER
      ? "returnSupplier"
      : "returnCustomer"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("nav.qcProcessing")}</h1>
      </div>

      <Tabs defaultValue="pass">
        <TabsList>
          <TabsTrigger value="pass">{t("qcPage.tabQcPass")}</TabsTrigger>
          <TabsTrigger value="dispose">{t("qcPage.tabDispose")}</TabsTrigger>
          <TabsTrigger value="done">{t("qcPage.tabDone")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pass" className="space-y-3 pt-2">
          {renderRows(passUnits.data, passSelected, setPassSelected, true)}
          <div className="flex justify-end">
            <Button
              onClick={() => passMut.mutate(passSelected)}
              disabled={passSelected.length === 0 || passMut.isPending}
            >
              <CheckCircle2 className="size-4 mr-1.5" />
              {passMut.isPending ? t("common.processing") : t("qcPage.qcPass", { count: passSelected.length })}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="done" className="space-y-3 pt-2">
          {renderRows(doneUnits.data, [], () => {}, false)}
        </TabsContent>

        <TabsContent value="dispose" className="space-y-3 pt-2">
          {renderRows(disposeUnits.data, disposeSelected, setDisposeSelected, true)}
          <div className="flex justify-end gap-2">
            <Button
              variant="destructive"
              onClick={() => setConfirmAction("DISPOSED")}
              disabled={disposeSelected.length === 0 || disposeMut.isPending}
            >
              <Trash2 className="size-4 mr-1.5" />
              {t("qcPage.dispose", { count: disposeSelected.length })}
            </Button>
            {allSelectedWaitingRma(disposeUnits.data, disposeSelected) && (
              <Button
                variant="outline"
                onClick={() => setConfirmAction("SEND_WARRANTY")}
                disabled={disposeMut.isPending}
              >
                <Send className="size-4 mr-1.5" />
                {t("qcPage.sendWarranty", { count: disposeSelected.length })}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setConfirmAction("RETURN")}
              disabled={
                disposeSelected.length === 0 ||
                hasMixedReturnTargets(disposeUnits.data, disposeSelected) ||
                disposeMut.isPending
              }
            >
              <Undo2 className="size-4 mr-1.5" />
              {t(`qcPage.${returnTargetKey(disposeUnits.data, disposeSelected)}`, { count: disposeSelected.length })}
            </Button>
          </div>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmAction(null)}
        >
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold mb-1">
              {confirmAction === "DISPOSED"
                ? t("qcPage.disposeConfirmTitle")
                : confirmAction === "SEND_WARRANTY"
                  ? t("qcPage.sendWarrantyConfirmTitle")
                  : t(`qcPage.${returnTargetKey(disposeUnits.data, disposeSelected)}ConfirmTitle`)}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {confirmAction === "DISPOSED"
                ? t("qcPage.disposeConfirmDesc")
                : confirmAction === "SEND_WARRANTY"
                  ? t("qcPage.sendWarrantyConfirmDesc")
                  : t(`qcPage.${returnTargetKey(disposeUnits.data, disposeSelected)}ConfirmDesc`)}
            </p>
            <div className="flex justify-end gap-2">
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
                      : disposeMut.mutate(
                          disposeUnits.data?.find((u) => disposeSelected.includes(u.id))?.status ===
                            PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE
                            ? PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER
                            : PRODUCT_UNIT_STATUS.REJECTED_RETURN,
                        )
                }
                disabled={disposeMut.isPending}
              >
                {disposeMut.isPending ? t("common.processing") : t("dialog.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
