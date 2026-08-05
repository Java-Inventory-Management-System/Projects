import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { LineItem, DiscrepancyNote } from "@/utils/types"
import type { ItemAction } from "../reducers/import-create-reducer"
import { toast } from "@/utils/toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SerialModal } from "@/features/stock/components/serial-modal"
import { LocationPicker } from "@/features/stock/components/location-picker"
import { ScanLine, CircleCheckBig, Circle, ClipboardList, Check, X, Plus, ListChecks } from "lucide-react"

interface PreviewEntry {
  line: number
  serial: string
  status: "ok" | "duplicate"
  duplicateWith: number[]
}

function SerialPreview({ pasteText }: { pasteText: string }) {
  const { t } = useTranslation()
  const entries = useMemo<PreviewEntry[]>(() => {
    const all: Array<{ line: number; serial: string }> = []
    const lines = pasteText.split("\n")
    for (const line of lines) {
      if (!line.trim()) continue
      const colonIdx = line.indexOf(":")
      if (colonIdx !== -1) {
        const serials = line.slice(colonIdx + 1).split(/[,;]/).map((s) => s.trim()).filter(Boolean)
        for (const s of serials) all.push({ line: all.length + 1, serial: s })
      }
    }
    const seen = new Map<string, number[]>()
    const result: PreviewEntry[] = []
    for (const item of all) {
      const key = item.serial.toLowerCase()
      if (seen.has(key)) {
        seen.get(key)!.push(item.line)
        result.push({ ...item, status: "duplicate", duplicateWith: seen.get(key)!.slice(0, -1) })
      } else {
        seen.set(key, [item.line])
        result.push({ ...item, status: "ok", duplicateWith: [] })
      }
    }
    for (const entry of result) {
      if (entry.status === "duplicate") continue
      const dup = result.find((r) => r.status === "duplicate" && r.serial.toLowerCase() === entry.serial.toLowerCase())
      if (dup) entry.status = "duplicate"
    }
    return result
  }, [pasteText])

  if (entries.length === 0) return null

  return (
    <div className="rounded-lg border text-sm">
      <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground bg-muted/30 flex items-center gap-2">
        <span>{t('serial.preview', { count: entries.length })}</span>
        <span className="text-green-600">{t('serial.ok', { count: entries.filter((e) => e.status === "ok").length })}</span>
        {entries.some((e) => e.status === "duplicate") && (
          <span className="text-destructive">{entries.filter((e) => e.status === "duplicate").length} {t("importStepSerials.errors")}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 p-2.5 max-h-[160px] overflow-y-auto">
        {entries.map((e, i) =>
          e.status === "ok" ? (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-mono text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300"
            >
              <Check className="size-3" />
              {e.serial}
            </span>
          ) : (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-mono text-destructive cursor-help">
                  <X className="size-3" />
                  {e.serial}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {t("importStepSerials.duplicateWith", { lines: e.duplicateWith.map((d) => `#${d}`).join(", ") })}
              </TooltipContent>
            </Tooltip>
          ),
        )}
      </div>
    </div>
  )
}

interface Props {
  items: LineItem[]
  dispatch: React.Dispatch<ItemAction>
  discrepancyNotes: DiscrepancyNote[]
  onDiscrepancyNotesChange: (notes: DiscrepancyNote[]) => void
  suggestedLocations?: Record<number, number>
}

export function ImportStepSerials({ items, dispatch, discrepancyNotes, onDiscrepancyNotesChange, suggestedLocations }: Props) {
  const { t } = useTranslation()
  const [serialModalOpen, setSerialModalOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<number | null>(null)
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false)
  const [discDesc, setDiscDesc] = useState("")
  const [discQty, setDiscQty] = useState("")

  const activeItem = items.find((i) => i.tempId === activeItemId)

  const totalExpected = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])
  const totalReceived = useMemo(() => items.filter((i) => i.itemStatus !== "NOT_RECEIVED").reduce((s, i) => s + i.serials.length, 0), [items])
  const progressPct = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0

  function saveSerials(tempId: number, serials: string[]) {
    dispatch({ type: "SAVE_SERIALS", tempId, serials })
    if (serials.length > 0) {
      const item = items.find((i) => i.tempId === tempId)
      if (item && item.itemStatus === "NOT_RECEIVED") {
        dispatch({ type: "SET_ITEM_STATUS", tempId, itemStatus: "NORMAL" })
      }
    }
  }

  function handlePasteSerials() {
    const lines = pasteText.split("\n").filter(Boolean)
    const matchedSkus = new Set(
      lines.filter((l) => l.includes(":")).map((l) => l.trim().toLowerCase().split(":")[0].trim()),
    )
    const parsed = items.filter((i) => matchedSkus.has(i.productSku.toLowerCase())).length
    dispatch({ type: "PASTE_SERIALS", pasteText })
    for (const item of items) {
      if (matchedSkus.has(item.productSku.toLowerCase())) {
        const line = lines.find((l) => l.trim().toLowerCase().startsWith(item.productSku.toLowerCase()))
        if (line) {
          const colonIdx = line.indexOf(":")
          if (colonIdx !== -1) {
            const serials = line.slice(colonIdx + 1).split(/[,;]/).map((s) => s.trim()).filter(Boolean)
            if (serials.length > 0 && item.itemStatus === "NOT_RECEIVED") {
              dispatch({ type: "SET_ITEM_STATUS", tempId: item.tempId, itemStatus: "NORMAL" })
            }
          }
        }
      }
    }
    toast.success(t("importStepSerials.assignedSerials", { count: parsed }))
    if (parsed > 0) {
      setPasteDialogOpen(false)
      setPasteText("")
    }
  }

  function addDiscrepancy() {
    if (!discDesc.trim()) {
      toast.error(t("importStepSerials.requireDescription"))
      return
    }
    const qty = Number(discQty) || 0
    if (qty <= 0) {
      toast.error(t("importStepSerials.requirePositiveQty"))
      return
    }
    onDiscrepancyNotesChange([
      ...discrepancyNotes,
      { description: discDesc.trim(), estimatedQuantity: qty, reportedBy: 0, reportedAt: "" },
    ])
    setDiscDesc("")
    setDiscQty("")
  }

  function removeDiscrepancy(index: number) {
    onDiscrepancyNotesChange(discrepancyNotes.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{t("importStepSerials.heading")}</h2>

      {items.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{t("importStepSerials.progress")}:</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-medium tabular-nums">{totalReceived}/{totalExpected}</span>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">{t("importStepSerials.product")}</TableHead>
                  <TableHead className="w-16 text-right">{t("importStepSerials.expected")}</TableHead>
                  <TableHead className="w-20 text-center">{t("importStepSerials.received")}</TableHead>
                  <TableHead className="w-28 text-center">{t("importStepSerials.serial")}</TableHead>
                  <TableHead className="w-36">{t("importStepSerials.location")}</TableHead>
                  <TableHead className="w-28 text-center">{t("importStepSerials.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const serialCount = item.serials.length
                  const serialOk = serialCount === item.quantity
                  const isNotReceived = item.itemStatus === "NOT_RECEIVED"
                  return (
                    <TableRow key={item.tempId}>
                      <TableCell className="font-medium text-sm truncate max-w-[200px]" title={item.productName}>
                        <span className="inline-flex items-center gap-1.5">
                          {isNotReceived ? (
                            <X className="size-4 shrink-0 text-muted-foreground" />
                          ) : serialOk ? (
                            <CircleCheckBig className="size-4 shrink-0 text-green-600" />
                          ) : (
                            <Circle className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          {item.productName}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-center tabular-nums text-sm">
                        {isNotReceived ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <span className={serialOk ? "text-green-600 font-medium" : "text-amber-600"}>
                            {serialCount}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isNotReceived ? (
                          <span className="text-xs text-muted-foreground italic">{t("importStepSerials.notReceived")}</span>
                        ) : (
                          <Button
                            variant={serialOk ? "outline" : "secondary"}
                            size="sm"
                            className="gap-1 text-xs h-9"
                            onClick={() => {
                              setActiveItemId(item.tempId)
                              setSerialModalOpen(true)
                            }}
                          >
                            <ScanLine className="size-3.5" />
                            {serialCount}/{item.quantity}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <LocationPicker
                          value={item.locationId}
                          onSelect={(locId) =>
                            dispatch({ type: "UPDATE_ITEM", tempId: item.tempId, field: "locationId", value: locId })
                          }
                          suggestedLocationId={suggestedLocations?.[item.tempId]}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isNotReceived ? "secondary" : "ghost"}
                              size="sm"
                              className="gap-1 text-xs h-9"
                              disabled={!isNotReceived && serialCount > 0}
                              onClick={() => {
                                if (isNotReceived) {
                                  dispatch({ type: "SET_ITEM_STATUS", tempId: item.tempId, itemStatus: "NORMAL", notReceivedReason: "" })
                                } else {
                                  dispatch({ type: "SET_ITEM_STATUS", tempId: item.tempId, itemStatus: "NOT_RECEIVED" })
                                }
                              }}
                            >
                              {isNotReceived ? (
                                <><Check className="size-3" /> {t("importStepSerials.receivedLabel")}</>
                              ) : (
                                <><X className="size-3" /> {t("importStepSerials.notReceivedLabel")}</>
                              )}
                            </Button>
                          </TooltipTrigger>
                          {!isNotReceived && serialCount > 0 && (
                            <TooltipContent side="top" className="text-xs">
                              {t("importStepSerials.cannotMarkNotReceived")}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {items.some((i) => i.itemStatus === "NOT_RECEIVED" && i.notReceivedReason) && (
            <div className="text-xs text-muted-foreground space-y-1">
              {items.filter((i) => i.itemStatus === "NOT_RECEIVED" && i.notReceivedReason).map((i) => (
                <p key={i.tempId}>
                  <strong>{i.productName}:</strong> {i.notReceivedReason}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground italic">
          {t("importStepSerials.receivedProgress", { received: totalReceived, expected: totalExpected })}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setDiscrepancyOpen(true)}>
            <ListChecks className="size-3.5" />
            {t("importStepSerials.discrepancy", { count: discrepancyNotes.length })}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setPasteDialogOpen(true)}>
            <ClipboardList className="size-3.5" />
            {t("importStepSerials.pasteSerials")}
          </Button>
        </div>
      </div>

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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("importStepSerials.pasteTitle")}</DialogTitle>
            <DialogDescription>
              {t("importStepSerials.pasteDesc")} <code className="text-xs bg-muted px-1">SKU: serial1, serial2</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              className="min-h-[120px] font-mono text-sm"
              placeholder={"SKU-001: SN240701-001, SN240701-002\nSKU-002: SN240701-003"}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            {pasteText.trim() && <SerialPreview pasteText={pasteText} />}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasteDialogOpen(false)
                setPasteText("")
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handlePasteSerials} disabled={!pasteText.trim()}>
              {t("importStepSerials.apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discrepancyOpen} onOpenChange={setDiscrepancyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("importStepSerials.discrepancyTitle")}</DialogTitle>
            <DialogDescription>
              {t("importStepSerials.discrepancyDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {discrepancyNotes.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {discrepancyNotes.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <span className="flex-1 truncate">{d.description}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">SL: {d.estimatedQuantity}</span>
                    <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => removeDiscrepancy(i)}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t("importStepSerials.description")}</Label>
                <Input
                  placeholder={t("importStepSerials.descriptionPlaceholder")}
                  value={discDesc}
                  onChange={(e) => setDiscDesc(e.target.value)}
                />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">{t("importStepSerials.qty")}</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="1"
                  value={discQty}
                  onChange={(e) => setDiscQty(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={addDiscrepancy}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDiscrepancyOpen(false)}>{t("importStepSerials.done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
