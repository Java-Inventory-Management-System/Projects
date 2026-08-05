import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { LocationPicker } from "../components/location-picker"
import { LocationCodePopover } from "../components/location-code-popover"
import { useLocationMap } from "@/hooks/use-location-map"
import { getBoxableImports, sealBox } from "@/services/box-service"
import { getImportReceiptUnits } from "@/services/import-service"
import { getLocations } from "@/services/location-service"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { toast } from "@/utils/toast"
import {
  PRODUCT_UNIT_STATUS,
  type Box,
  type BoxType,
  type ProductUnit,
} from "@/utils/types"
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ChevronDown, ChevronRight, PackageSearch, ScanLine } from "lucide-react"

const COLLAPSE_THRESHOLD = 6

// ponytail: FE hiển thị N theo loại hộp — backend là nguồn sự thật (app.box.max-units)
export const BOX_TYPE_MAX: Record<BoxType, number> = { SMALL: 20, MEDIUM: 50, LARGE: 100 }
const BOX_TYPES: BoxType[] = ["SMALL", "MEDIUM", "LARGE"]

export interface SealBoxPayload {
  unitIds: number[]
  items?: Array<{ unitId: number; quantity: number }>
  locationId: number
  note?: string
  boxType?: BoxType
}

export function SealBoxPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState<0 | 1 | 2 | "done">(0)
  const [search, setSearch] = useState("")
  const [importInfo, setImportInfo] = useState<{ receiptId: number; receiptCode: string; supplierName: string | null } | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkQty, setBulkQty] = useState<Record<number, number>>({})
  const [boxType, setBoxType] = useState<BoxType>("MEDIUM")
  const [locationId, setLocationId] = useState("")
  const [note, setNote] = useState("")
  const [lastBox, setLastBox] = useState<Box | null>(null)
  const [sealingError, setSealingError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const locationTouched = useRef(false)

  const maxUnits = BOX_TYPE_MAX[boxType]

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocations(),
  })

  const { data: locationMap } = useLocationMap()

  const { data: boxableImports = [] } = useQuery({
    queryKey: ["boxable-imports"],
    queryFn: getBoxableImports,
  })

  const { data: units = [], isFetching: loadingUnits } = useQuery({
    queryKey: ["import-units", importInfo?.receiptId],
    queryFn: () => getImportReceiptUnits(importInfo!.receiptId),
    enabled: step === 1 && importInfo != null,
  })

  const sealMut = useMutation({
    mutationFn: sealBox,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boxes"] })
      qc.invalidateQueries({ queryKey: ["product-units"] })
      qc.invalidateQueries({ queryKey: ["boxable-imports"] })
      qc.invalidateQueries({ queryKey: ["location-map"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
    },
    onError: (err: Error) => toast.error(err.message || t("box.error")),
  })

  const boxable = useMemo(
    () =>
      units.filter(
        (u) => u.status === PRODUCT_UNIT_STATUS.IN_STOCK && !u.boxId,
      ),
    [units],
  )

  const groups = useMemo(() => {
    const map = new Map<number, { productId: number; productName: string; productSku: string; units: ProductUnit[] }>()
    for (const u of boxable) {
      const g = map.get(u.productId) ?? { productId: u.productId, productName: u.productName, productSku: u.productSku, units: [] }
      g.units.push(u)
      map.set(u.productId, g)
    }
    return [...map.values()]
  }, [boxable])

  useEffect(() => {
    if (groups.length === 0) return
    const next = new Set(collapsed)
    let changed = false
    for (const g of groups) {
      const n = g.units.filter((u) => u.trackingType !== "BULK").length
      if (n > COLLAPSE_THRESHOLD && !next.has(g.productId)) {
        next.add(g.productId)
        changed = true
      }
    }
    if (changed) setCollapsed(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups])

  useEffect(() => {
    if (locationTouched.current) return
    const u = boxable.find(
      (x) => selected.has(x.id) && x.locationId != null && locations.some((l) => l.id === x.locationId),
    )
    setLocationId(u?.locationId != null ? String(u.locationId) : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, boxable])

  const filteredImports = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return boxableImports
    return boxableImports.filter(
      (r) =>
        r.receiptCode.toLowerCase().includes(q) ||
        (r.supplierName ?? "").toLowerCase().includes(q),
    )
  }, [boxableImports, search])

  const unitQty = (u: ProductUnit) =>
    u.trackingType === "BULK" ? bulkQty[u.id] ?? u.remainingQuantity ?? 0 : 1

  const selectedTotal = useMemo(() => {
    let total = 0
    for (const u of boxable) if (selected.has(u.id)) total += unitQty(u)
    return total
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxable, selected, bulkQty])

  const remainingSlots = maxUnits - selectedTotal
  const overCapacity = selectedTotal > maxUnits

  const binCapacityExceeded = useMemo(() => {
    if (!locationMap || !locationId) return false
    const binId = Number(locationId)
    for (const zone of locationMap.zones) {
      for (const shelf of zone.shelves) {
        const bin = shelf.bins.find((b) => b.id === binId)
        if (!bin || bin.maxCapacity == null) return false
        const movingOut = boxable
          .filter((u) => selected.has(u.id) && u.locationId === binId)
          .reduce((sum, u) => sum + unitQty(u), 0)
        return bin.productCount - movingOut + selectedTotal > bin.maxCapacity
      }
    }
    return false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationMap, locationId, selectedTotal, boxable, selected, bulkQty])

  const pickImport = (receiptId: number, receiptCode: string, supplierName: string | null) => {
    setImportInfo({ receiptId, receiptCode, supplierName })
    setSelected(new Set())
    setBulkQty({})
    setStep(1)
  }

  const tryAdd = (unit: ProductUnit) => {
    const qty = unitQty(unit)
    if (selectedTotal + qty > maxUnits) {
      toast.warning(t("box.maxUnitsReached", { max: maxUnits, type: t(`box.boxTypes.${boxType}`) }))
      return false
    }
    setSelected((prev) => new Set(prev).add(unit.id))
    return true
  }

  const toggle = (unit: ProductUnit) => {
    if (selected.has(unit.id)) {
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(unit.id)
        return next
      })
    } else {
      tryAdd(unit)
    }
  }

  const toggleProduct = (g: (typeof groups)[number]) => {
    const serialized = g.units.filter((u) => u.trackingType !== "BULK")
    if (serialized.some((u) => selected.has(u.id))) {
      const next = new Set(selected)
      for (const u of serialized) next.delete(u.id)
      setSelected(next)
      return
    }
    let slots = remainingSlots
    const next = new Set(selected)
    let cut = false
    for (const u of serialized) {
      if (next.has(u.id)) continue
      if (slots <= 0) {
        cut = true
        break
      }
      next.add(u.id)
      slots -= 1
    }
    setSelected(next)
    if (cut) toast.warning(t("box.maxUnitsReached", { max: maxUnits, type: t(`box.boxTypes.${boxType}`) }))
  }

  const changeBulkQty = (unit: ProductUnit, value: number) => {
    const oldQty = bulkQty[unit.id] ?? unit.remainingQuantity ?? 0
    let qty = value
    const overflow = selectedTotal - oldQty + qty - maxUnits
    if (overflow > 0) qty = qty - overflow
    setBulkQty((prev) => ({ ...prev, [unit.id]: Math.max(0, qty) }))
  }

  const handleScan = (serial: string) => {
    const s = serial.trim()
    if (!s) return
    const unit = boxable.find((u) => u.serialNumber?.toUpperCase() === s.toUpperCase())
    if (!unit) {
      toast.warning(t("box.serialNotFound", { serial: s }))
      return
    }
    if (selected.has(unit.id)) {
      toast.info(t("box.serialDuplicate", { serial: s }))
      return
    }
    tryAdd(unit)
    setBarcodeInput("")
  }

  const { scanning, barcodeInput, setBarcodeInput, videoRef, toggleCamera } = useBarcodeScanner(handleScan)

  const submit = async () => {
    setSealingError(null)
    const items: Array<{ unitId: number; quantity: number }> = []
    const unitIds: number[] = []
    for (const u of boxable) {
      if (!selected.has(u.id)) continue
      if (u.trackingType === "BULK" && bulkQty[u.id] != null && u.remainingQuantity != null && bulkQty[u.id] < u.remainingQuantity) {
        items.push({ unitId: u.id, quantity: bulkQty[u.id] })
      } else {
        unitIds.push(u.id)
      }
    }
    try {
      const box = await sealMut.mutateAsync({
        unitIds,
        items: items.length > 0 ? items : undefined,
        locationId: Number(locationId),
        note: note || undefined,
        boxType,
      })
      qc.invalidateQueries({ queryKey: ["import-units", importInfo?.receiptId] })
      setLastBox(box)
      setStep("done")
    } catch (err) {
      setSealingError((err as Error).message)
    }
  }

  const continueSealing = async () => {
    if (importInfo) await qc.refetchQueries({ queryKey: ["import-units", importInfo.receiptId] })
    setSelected(new Set())
    setBulkQty({})
    locationTouched.current = false
    setSealingError(null)
    setStep(1)
  }

  const sealAnother = () => {
    setLastBox(null)
    setImportInfo(null)
    setSelected(new Set())
    setBulkQty({})
    setLocationId("")
    setNote("")
    locationTouched.current = false
    setStep(0)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/stock/units?tab=box")}>
          <ArrowLeft className="size-4 mr-1" /> {t("box.back")}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("box.sealTitle")}</h1>
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <Input
            placeholder={t("box.searchImportPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
            {filteredImports.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <PackageSearch className="mx-auto mb-2 size-8 opacity-40" />
                {t("box.noBoxableImports")}
              </div>
            )}
            {filteredImports.map((r) => (
              <button
                key={r.receiptId}
                type="button"
                onClick={() => pickImport(r.receiptId, r.receiptCode, r.supplierName)}
                className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-medium">{r.receiptCode}</p>
                  <p className="truncate text-muted-foreground">{r.supplierName ?? "—"}</p>
                </div>
                <Badge variant="outline">{t("box.boxableUnitsCount", { count: r.boxableUnits })}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && importInfo && (
        <div className="space-y-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium">{importInfo.receiptCode}</p>
            <p className="truncate text-xs text-muted-foreground">{importInfo.supplierName ?? "—"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("box.boxType")}:</span>
            {BOX_TYPES.map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={boxType === type ? "default" : "outline"}
                onClick={() => setBoxType(type)}
              >
                {t(`box.boxTypes.${type}`)}
                <span className="ml-1.5 text-xs opacity-70">({BOX_TYPE_MAX[type]})</span>
              </Button>
            ))}
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{t("box.progress", { count: selectedTotal, max: maxUnits })}</span>
              <span>{t("box.maxUnitsHint", { max: maxUnits, type: t(`box.boxTypes.${boxType}`) })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (selectedTotal / maxUnits) * 100)}%` }}
              />
            </div>
            {overCapacity && (
              <p className="mt-1 text-xs text-destructive">
                {t("box.maxUnitsReached", { max: maxUnits, type: t(`box.boxTypes.${boxType}`) })}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={t("box.serialPlaceholder")}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleScan(barcodeInput)
              }}
              className="font-mono"
            />
            <Button type="button" variant="outline" size="icon" onClick={toggleCamera} title={t("box.scanCamera")}>
              <Camera className="size-4" />
            </Button>
          </div>
          {scanning && (
            <video ref={videoRef} className="h-32 w-full rounded-lg border bg-black object-cover" muted playsInline />
          )}

          <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
            {loadingUnits && (
              <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
            )}
            {!loadingUnits && groups.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">{t("box.noBoxableUnits")}</p>
            )}
            {groups.map((g) => {
              const serialized = g.units.filter((u) => u.trackingType !== "BULK")
              const allSelected = serialized.length > 0 && serialized.every((u) => selected.has(u.id))
              const isCollapsed = collapsed.has(g.productId)
              return (
                <div key={g.productId} className="border-b last:border-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const next = new Set(collapsed)
                      if (isCollapsed) next.delete(g.productId)
                      else next.add(g.productId)
                      setCollapsed(next)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        const next = new Set(collapsed)
                        if (isCollapsed) next.delete(g.productId)
                        else next.add(g.productId)
                        setCollapsed(next)
                      }
                    }}
                    className="flex w-full items-center gap-2 bg-muted/40 px-3 py-2 text-sm text-left hover:bg-muted/60 cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleProduct(g)}
                      disabled={serialized.length === 0}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium">{g.productName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{g.productSku}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {serialized.filter((u) => selected.has(u.id)).length}/{serialized.length}
                    </span>
                  </div>
                  {!isCollapsed &&
                    g.units.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 border-t px-3 py-2 text-sm last:border-0 hover:bg-muted/30">
                        <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u)} />
                        <span className="font-mono text-xs">{u.serialNumber ?? u.productName}</span>
                        {u.serialNumber && (
                          <span className="ml-2 truncate text-muted-foreground">{u.productName}</span>
                        )}
                        {u.trackingType === "BULK" && selected.has(u.id) && (
                          <Input
                            type="number"
                            min={0}
                            max={u.remainingQuantity ?? undefined}
                            className="ml-auto h-7 w-24 text-right"
                            value={bulkQty[u.id] ?? u.remainingQuantity ?? ""}
                            onChange={(e) => changeBulkQty(u, Number(e.target.value))}
                          />
                        )}
                        {u.trackingType !== "BULK" && (
                          <span className="ml-auto">
                            <LocationCodePopover code={u.locationCode} />
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )
            })}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="size-4 mr-1" /> {t("box.back")}
            </Button>
            <Button onClick={() => setStep(2)} disabled={selected.size === 0 || overCapacity}>
              {t("box.next")} <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && importInfo && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-medium">{importInfo.receiptCode}</span>
              <Badge variant="secondary">{t(`box.boxTypes.${boxType}`)}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("box.selectedUnitsCount", { count: selectedTotal })}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t("box.location")}</Label>
            <LocationPicker
              value={locationId}
              onSelect={(id) => {
                locationTouched.current = true
                setLocationId(id)
              }}
            />
            {binCapacityExceeded && (
              <p className="text-xs text-destructive">{t("box.binCapacityExceeded")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="box-note">{t("box.note")}</Label>
            <Textarea id="box-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {sealingError && <p className="text-sm text-destructive">{sealingError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(1)} disabled={sealMut.isPending}>
              <ArrowLeft className="size-4 mr-1" /> {t("box.back")}
            </Button>
            <Button
              onClick={submit}
              disabled={sealMut.isPending || selected.size === 0 || !locationId || overCapacity || binCapacityExceeded}
            >
              {sealMut.isPending ? t("box.sealing") : t("box.seal")}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && lastBox && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="size-10 text-emerald-500" />
            <p className="font-medium">{t("box.sealSuccess")}</p>
            <p className="font-mono text-xs text-muted-foreground">{lastBox.boxCode}</p>
          </div>
          {boxable.length - selected.size > 0 && (
            <Button variant="outline" className="w-full" onClick={continueSealing}>
              <ScanLine className="size-4 mr-1" />
              {t("box.continueSealing", { count: boxable.length - selected.size })}
            </Button>
          )}
          <Button className="w-full" onClick={sealAnother}>
            {t("box.sealAnother")}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/stock/units?tab=box")}>
            <ArrowLeft className="size-4 mr-1" /> {t("box.back")}
          </Button>
        </div>
      )}
    </div>
  )
}
