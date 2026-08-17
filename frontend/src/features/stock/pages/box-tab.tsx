import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getBoxes, getBoxById, unsealBox, moveBox, deleteBox } from "@/services/box-service"
import { useLocationMap } from "@/hooks/use-location-map"
import { PrintReceiptButton } from "../components/print-receipt"
import { LocationPicker } from "../components/location-picker"
import { LocationCodePopover } from "../components/location-code-popover"
import { BOX_STATUS, TRACKING_TYPE, type Box } from "@/utils/types"
import { toKey, BOX_STATUS_VARIANT } from "@/utils/labels"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { DataTable, type Column } from "@/components/ui/data-table"
import { toast } from "@/utils/toast"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Boxes, ClipboardList, AlertTriangle } from "lucide-react"

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
}

export const BoxTab = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const perm = usePermission()
  const canSeal = perm.hasRole(...ROLES.SEAL_BOX)
  const [status, setStatus] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [mismatch, setMismatch] = useState<{ boxId: number; boxCode: string; sealed: number; actual: number } | null>(null)

  const { data: boxesRes, isLoading } = useQuery({
    queryKey: ["boxes", status, page, pageSize],
    queryFn: () =>
      getBoxes({ status: status === "all" ? undefined : status, page, size: pageSize }),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
  const boxes = boxesRes?.content

  const unsealMut = useMutation({
    mutationFn: async (boxId: number) => {
      const detail = await getBoxById(boxId)
      const actual = (detail.units ?? []).reduce(
        (sum, u) => sum + (u.trackingType === TRACKING_TYPE.BULK ? u.quantity ?? 0 : 1),
        0,
      )
      const res = await unsealBox(boxId)
      if (actual !== detail.sealedQuantity) {
        setMismatch({ boxId, boxCode: detail.boxCode, sealed: detail.sealedQuantity, actual })
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boxes"] })
      qc.invalidateQueries({ queryKey: ["product-units"] })
      qc.invalidateQueries({ queryKey: ["location-map"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      toast.success(t("box.unsealSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("box.error")),
  })

  const moveMut = useMutation({
    mutationFn: ({ id, locationId }: { id: number; locationId: number }) => moveBox(id, locationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boxes"] })
      qc.invalidateQueries({ queryKey: ["location-map"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      toast.success(t("box.moveSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("box.error")),
  })

  const deleteMut = useMutation({
    mutationFn: deleteBox,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boxes"] })
      qc.invalidateQueries({ queryKey: ["product-units"] })
      qc.invalidateQueries({ queryKey: ["location-map"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      toast.success(t("box.deleteSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("box.error")),
  })

  const columns: Column<Box>[] = [
    { header: <BoxHeader i18nKey="box.code" />, render: (b) => <span className="font-mono text-xs">{b.boxCode}</span> },
    { header: <BoxHeader i18nKey="box.importReceipt" />, render: (b) => <span className="font-mono text-xs text-muted-foreground">{b.importReceiptCode ?? "—"}</span> },
    { header: <BoxHeader i18nKey="box.boxType" />, render: (b) => <span className="text-xs">{b.boxType ? t(`box.boxTypes.${b.boxType}`) : "—"}</span> },
    {
      header: <BoxHeader i18nKey="box.status" />,
      render: (b) => (
        <Badge variant={BOX_STATUS_VARIANT[b.status]}>
          {t(`box.${toKey(b.status)}`)}
        </Badge>
      ),
    },
    { header: <BoxHeader i18nKey="box.location" />, render: (b) => <LocationCodePopover code={b.locationCode} /> },
    { header: <BoxHeader i18nKey="box.quantity" right />, className: "text-right", render: (b) => <span className="tabular-nums">{b.sealedQuantity}</span> },
    { header: <BoxHeader i18nKey="box.unitCount" right />, className: "text-right", render: (b) => <span className="tabular-nums">{b.unitCount}</span> },
    { header: <BoxHeader i18nKey="box.sealedAt" />, render: (b) => <span className="text-muted-foreground text-xs">{fmt(b.sealedAt)}</span> },
    {
      header: <BoxHeader i18nKey="table.actions" right />,
      className: "text-right",
      render: (b) => (
        <BoxActions
          box={b}
          onUnseal={() => unsealMut.mutate(b.id)}
          unsealPending={unsealMut.isPending}
          onMove={(loc) => moveMut.mutate({ id: b.id, locationId: loc })}
          movePending={moveMut.isPending}
          onDelete={() => deleteMut.mutate(b.id)}
          deletePending={deleteMut.isPending}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {mismatch && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm">
          <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              {t("box.mismatchTitle")} {mismatch.boxCode}
            </p>
            <p className="text-amber-600 dark:text-amber-300 mt-0.5">
              {t("box.mismatchDesc", { sealed: mismatch.sealed, actual: mismatch.actual })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/stock/ops/checks/new?scopeType=BOX&scopeId=${mismatch.boxId}`)}
          >
            <ClipboardList className="size-4 mr-1" /> {t("box.createCheckForBox")}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("box.title")}</h1>
{canSeal && (
<Button className="gap-1.5" onClick={() => navigate("/stock/units/box/new?tab=box")}>
<Boxes className="size-4" /> {t("box.seal")}
</Button>
)}
      </div>

      <div className="flex gap-2">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value={BOX_STATUS.SEALED}>{t("box.sealed")}</SelectItem>
            <SelectItem value={BOX_STATUS.UNSEALED}>{t("box.unsealed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={boxes ?? []}
        isLoading={isLoading}
        emptyMessage={t("box.empty")}
        totalElements={boxesRes?.pagination?.totalElements}
        totalPages={boxesRes?.pagination?.totalPages}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s)
          setPage(0)
        }}
        rowKey={(b) => b.id}
      />
    </div>
  )
}

function BoxHeader({ i18nKey, right }: { i18nKey: string; right?: boolean }) {
  const { t } = useTranslation()
  return <span className={right ? "w-full inline-flex justify-end" : undefined}>{t(i18nKey)}</span>
}

function BoxActions({ box, onUnseal, unsealPending, onMove, movePending, onDelete, deletePending }: {
  box: Box
  onUnseal: () => void
  unsealPending: boolean
  onMove: (locationId: number) => void
  movePending: boolean
  onDelete: () => void
  deletePending: boolean
}) {
  const { t } = useTranslation()
  const perm = usePermission()
  const canOperate = perm.hasRole(...ROLES.CAN_OPERATE_STOCK)
  if (!canOperate) return <PrintReceiptButton id={box.id} type="box" />
  return (
    <div className="flex justify-end gap-1">
      <PrintReceiptButton id={box.id} type="box" />
      {box.status === BOX_STATUS.SEALED && (
        <>
          <MoveBoxButton box={box} onMove={onMove} pending={movePending} />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={unsealPending}>
                {t("box.unseal")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("box.unsealTitle")} {box.boxCode}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t("box.unsealConfirm")}</p>
              <DialogFooter>
                <Button variant="destructive" onClick={onUnseal} disabled={unsealPending}>
                  {unsealPending ? t("box.unsealing") : t("box.unseal")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      {box.status === BOX_STATUS.UNSEALED && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive">
              {t("common.delete")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("box.deleteTitle")} {box.boxCode}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t("box.deleteConfirm")}</p>
            <DialogFooter>
              <Button variant="destructive" onClick={onDelete} disabled={deletePending}>
                {deletePending ? t("box.deleting") : t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function MoveBoxButton({
  box,
  onMove,
  pending,
}: {
  box: Box
  onMove: (locationId: number) => void
  pending: boolean
}) {
  const { t } = useTranslation()
  const [locationId, setLocationId] = useState<string>("")
  const { data: locationMap } = useLocationMap()

  const binCapacityExceeded = useMemo(() => {
    if (!locationMap || !locationId) return false
    const binId = Number(locationId)
    if (box.locationId === binId) return false
    for (const zone of locationMap.zones) {
      for (const shelf of zone.shelves) {
        const bin = shelf.bins.find((b) => b.id === binId)
        if (bin && bin.maxCapacity != null) return bin.productCount + box.sealedQuantity > bin.maxCapacity
      }
    }
    return false
  }, [locationMap, locationId, box])

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) setLocationId("")
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{t("box.move")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("box.moveTitle")} {box.boxCode}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t("box.location")}</Label>
          <LocationPicker value={locationId} onSelect={setLocationId} />
          {binCapacityExceeded && (
            <p className="text-xs text-destructive">{t("box.binCapacityExceeded")}</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onMove(Number(locationId))} disabled={pending || !locationId || binCapacityExceeded}>
            {pending ? t("box.moving") : t("box.move")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
