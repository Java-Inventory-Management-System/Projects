import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { LineItem, LocationAllocation } from "@/utils/types"
import { TRACKING_TYPE } from "@/utils/types"
import type { ItemAction } from "../reducers/import-create-reducer"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LocationPicker } from "./location-picker"
import { SerialModal } from "./serial-modal"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "@/utils/toast"

interface Row extends LocationAllocation {
  tempKey: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LineItem
  dispatch: React.Dispatch<ItemAction>
}

export function BinAllocatorDialog({ open, onOpenChange, item, dispatch }: Props) {
  const { t } = useTranslation()
  const isBulk = item.trackingType === TRACKING_TYPE.BULK
  const [rows, setRows] = useState<Row[]>(() =>
    item.allocations.length > 0
      ? item.allocations.map((a, i) => ({ ...a, tempKey: i }))
      : [{ locationId: item.locationId, quantity: item.quantity, serials: item.serials, tempKey: 0 }],
  )
  const [serialModalFor, setSerialModalFor] = useState<number | null>(null)
  const [nextKey, setNextKey] = useState(() => Math.max(0, ...item.allocations.map((_, i) => i)) + 1)

  const qtyOf = (r: Row) => (isBulk ? r.quantity : r.serials.length)
  const sumQty = rows.reduce((s, r) => s + qtyOf(r), 0)
  const flatSerials = rows.flatMap((r) => r.serials)
  const hasDupSerials = new Set(flatSerials.map((s) => s.toLowerCase())).size !== flatSerials.length

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.tempKey === key ? { ...r, ...patch } : r)))

  const save = () => {
    if (rows.some((r) => !r.locationId)) {
      toast.error(t("binAllocator.missingBin"))
      return
    }
    if (sumQty !== item.quantity) {
      toast.error(t("binAllocator.qtyMismatch", { expected: item.quantity, actual: sumQty }))
      return
    }
    if (!isBulk && hasDupSerials) {
      toast.error(t("binAllocator.dupSerials"))
      return
    }
    dispatch({
      type: "SAVE_ALLOCATIONS",
      tempId: item.tempId,
      allocations: rows.map((r) => ({
        locationId: r.locationId,
        serials: r.serials,
        quantity: isBulk ? r.quantity : r.serials.length,
      })),
    })
    onOpenChange(false)
  }

  const activeRow = rows.find((r) => r.tempKey === serialModalFor)

  // ponytail: serial chưa nằm ở bin khác (từ PO), seed cho modal của dòng trống — không phải gõ lại
  const serialsForModal = useMemo(() => {
    if (!activeRow) return []
    if (activeRow.serials.length > 0) return activeRow.serials
    const inOtherRows = new Set(
      rows
        .filter((r) => r.tempKey !== activeRow.tempKey)
        .flatMap((r) => r.serials)
        .map((s) => s.toLowerCase()),
    )
    const unassigned = item.serials.filter((s) => !inOtherRows.has(s.toLowerCase()))
    return unassigned.length > 0 ? unassigned : item.serials
  }, [activeRow, rows, item.serials])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{t("binAllocator.title")}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {item.productName}
            <span className="font-mono ml-2">{item.productSku}</span>
            <span className="ml-2">
              {t("binAllocator.qty")}: {item.quantity}
            </span>
          </p>
        </DialogHeader>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.tempKey} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
              <div className="flex-1 min-w-0">
                <LocationPicker
                  value={row.locationId}
                  onSelect={(locId) => updateRow(row.tempKey, { locationId: locId })}
                />
              </div>
              {isBulk ? (
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <span className="text-xs text-muted-foreground">{t("binAllocator.qty")}</span>
                  <Input
                    type="number"
                    min={1}
                    className="h-8 text-right"
                    value={row.quantity || ""}
                    onChange={(e) => updateRow(row.tempKey, { quantity: Number(e.target.value) || 0 })}
                  />
                </div>
              ) : (
                <div className="w-36 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => setSerialModalFor(row.tempKey)}
                  >
                    {row.serials.length > 0
                      ? t("binAllocator.editSerials", { count: row.serials.length })
                      : t("binAllocator.addSerials")}
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setRows((prev) => prev.filter((r) => r.tempKey !== row.tempKey))}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => {
              setRows((prev) => [...prev, { locationId: "", quantity: 0, serials: [], tempKey: nextKey }])
              setNextKey(nextKey + 1)
            }}
          >
            <Plus className="size-3.5" /> {t("binAllocator.addBin")}
          </Button>
        </div>

        <p className={`text-xs ${sumQty === item.quantity ? "text-muted-foreground" : "text-destructive"}`}>
          {t("binAllocator.total", { actual: sumQty, expected: item.quantity })}
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} disabled={rows.length === 0}>
            {t("binAllocator.save")}
          </Button>
        </DialogFooter>

        {activeRow && (
          <SerialModal
            open={serialModalFor != null}
            onOpenChange={(open) => {
              if (!open) setSerialModalFor(null)
            }}
            productName={item.productName}
            productSku={item.productSku}
            required={item.quantity}
            serials={serialsForModal}
            onSave={(serials) => updateRow(activeRow.tempKey, { serials })}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}