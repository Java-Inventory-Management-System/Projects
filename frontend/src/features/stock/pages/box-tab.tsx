import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getBoxes, getBoxById, unsealBox, moveBox } from "@/services/box-service"
import { useLocationMap } from "@/hooks/use-location-map"
import { PrintReceiptButton } from "../components/print-receipt"
import { LocationPicker } from "../components/location-picker"
import { LocationCodePopover } from "../components/location-code-popover"
import { BOX_STATUS, type Box } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/utils/toast"
import { Package, Boxes, ClipboardList, AlertTriangle } from "lucide-react"

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
}

export const BoxTab = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>("all")
  const [mismatch, setMismatch] = useState<{ boxId: number; boxCode: string; sealed: number; actual: number } | null>(null)

  const { data: boxes, isLoading } = useQuery({
    queryKey: ["boxes", status],
    queryFn: () => getBoxes(status === "all" ? undefined : { status }),
  })

  const unsealMut = useMutation({
    mutationFn: async (boxId: number) => {
      const detail = await getBoxById(boxId)
      const actual = (detail.units ?? []).reduce(
        (sum, u) => sum + (u.trackingType === "BULK" ? u.quantity ?? 0 : 1),
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
            onClick={() => navigate(`/stock/checks/new?scopeType=BOX&scopeId=${mismatch.boxId}`)}
          >
            <ClipboardList className="size-4 mr-1" /> {t("box.createCheckForBox")}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("box.title")}</h1>
        <Button className="gap-1.5" onClick={() => navigate("/stock/units/box/new?tab=box")}>
          <Boxes className="size-4" /> {t("box.seal")}
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={status} onValueChange={setStatus}>
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

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">{t("box.code")}</th>
              <th className="px-4 py-2.5">{t("box.importReceipt")}</th>
              <th className="px-4 py-2.5">{t("box.boxType")}</th>
              <th className="px-4 py-2.5">{t("box.status")}</th>
              <th className="px-4 py-2.5">{t("box.location")}</th>
              <th className="px-4 py-2.5 text-right">{t("box.quantity")}</th>
              <th className="px-4 py-2.5 text-right">{t("box.unitCount")}</th>
              <th className="px-4 py-2.5">{t("box.sealedAt")}</th>
              <th className="px-4 py-2.5 text-right">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {(boxes ?? []).map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">{b.boxCode}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{b.importReceiptCode ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs">
                  {b.boxType ? t(`box.boxTypes.${b.boxType}`) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={b.status === BOX_STATUS.SEALED ? "default" : "secondary"}>
                    {b.status === BOX_STATUS.SEALED ? t("box.sealed") : t("box.unsealed")}
                  </Badge>
                </td>
                <td className="px-4 py-2.5"><LocationCodePopover code={b.locationCode} /></td>
                <td className="px-4 py-2.5 text-right">{b.sealedQuantity}</td>
                <td className="px-4 py-2.5 text-right">{b.unitCount}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{fmt(b.sealedAt)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <PrintReceiptButton id={b.id} type="box" />
                    {b.status === BOX_STATUS.SEALED && (
                      <>
                        <MoveBoxButton box={b} onMove={(loc) => moveMut.mutate({ id: b.id, locationId: loc })} pending={moveMut.isPending} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unsealMut.mutate(b.id)}
                          disabled={unsealMut.isPending}
                        >
                          {t("box.unseal")}
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && (boxes ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 size-8 opacity-40" />
                  {t("box.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
    <Dialog>
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
