import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { PRODUCT_UNIT_STATUS, STOCK_CHECK_DIFF, TRACKING_TYPE, UNVERIFIED_STATUS, type StockCheckItem } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Camera, Image, Loader2, ShieldAlert, PackageOpen, StickyNote, MoreHorizontal, PackagePlus, Check, AlertCircle } from "lucide-react"
import { cn } from "@/utils/cn"
import { UNIT_LABELS } from "@/utils/labels"
import { useFileUpload } from "@/hooks/use-file-upload"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  items: StockCheckItem[]
  canEdit: boolean
  onUpdate: (itemId: number, field: string, value: unknown) => void
  onBulkSet: (status: string) => void
  searchQuery: string
  onSearchChange: (v: string) => void
  filter: "all" | "mismatch" | "untouched"
  onFilterChange: (v: "all" | "mismatch" | "untouched") => void
  onAddExtra: (data: { sku: string; serialNumber?: string; countedQuantity?: number; note?: string }) => Promise<void>
  extraPending: boolean
}

const statusOptions = [
  PRODUCT_UNIT_STATUS.IN_STOCK,
  PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE,
  PRODUCT_UNIT_STATUS.LOST,
] as const

export function StockCheckItemsTable({
  items,
  canEdit,
  onUpdate,
  onBulkSet,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onAddExtra,
  extraPending,
}: Props) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const photoTargetRef = useRef<number | null>(null)
  const { upload, uploadingItemId } = useFileUpload()

  const [extraOpen, setExtraOpen] = useState(false)
  const [extraSku, setExtraSku] = useState("")
  const [extraSerial, setExtraSerial] = useState("")
  const [extraQty, setExtraQty] = useState("")
  const [extraNote, setExtraNote] = useState("")
  const [extraError, setExtraError] = useState<string | null>(null)

  const statusLabels: Record<string, string> = {
    [PRODUCT_UNIT_STATUS.IN_STOCK]: t("stockCheckItems.statusInStock"),
    [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: t("stockCheckItems.statusDamagedInStorage"),
    [PRODUCT_UNIT_STATUS.LOST]: t("stockCheckItems.statusLost"),
    [PRODUCT_UNIT_STATUS.REMOVED]: t("stockCheckItems.statusRemoved"),
    [PRODUCT_UNIT_STATUS.DISPOSED]: t("stockCheckItems.statusDisposed"),
  }

  const diffLabels: Record<string, string> = {
    [STOCK_CHECK_DIFF.MATCH]: t("stockCheckItems.diffMatch"),
    [STOCK_CHECK_DIFF.MISSING]: t("stockCheckItems.diffMissing"),
    [STOCK_CHECK_DIFF.UNEXPECTED]: t("stockCheckItems.diffUnexpected"),
    [STOCK_CHECK_DIFF.PARTIAL_SHORTAGE]: t("stockCheckItems.diffUnexpected"),
    [STOCK_CHECK_DIFF.SURPLUS]: t("stockCheckItems.diffSurplus"),
  }

  const counts = {
    total: items.length,
    mismatch: items.filter((i) => i.difference != null && i.difference !== STOCK_CHECK_DIFF.MATCH).length,
    untouched: items.filter((i) => i.actualStatus == null).length,
  }

  const filtered = items.filter((item) => {
    if (filter === "mismatch" && !(item.difference != null && item.difference !== STOCK_CHECK_DIFF.MATCH)) return false
    if (filter === "untouched" && item.actualStatus != null) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.serialNumber.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      (item.productSku ?? "").toLowerCase().includes(q)
    )
  })

  const hasBulk = filtered.some((i) => i.trackingType === TRACKING_TYPE.BULK)

  const handleAddExtra = async () => {
    setExtraError(null)
    if (!extraSku.trim()) {
      setExtraError(t("stockCheckItems.extraSkuRequired"))
      return
    }
    try {
      await onAddExtra({
        sku: extraSku.trim(),
        serialNumber: extraSerial.trim() || undefined,
        countedQuantity: extraQty ? Number(extraQty) : undefined,
        note: extraNote.trim() || undefined,
      })
      setExtraOpen(false)
      setExtraSku("")
      setExtraSerial("")
      setExtraQty("")
      setExtraNote("")
    } catch (err) {
      setExtraError((err as Error).message || t("stockCheckDetail.recordError"))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => onFilterChange(v as "all" | "mismatch" | "untouched")}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">
              {t("stockCheckItems.filterAll")} ({counts.total})
            </TabsTrigger>
            <TabsTrigger value="mismatch" className="text-xs px-3">
              {t("stockCheckItems.filterMismatch")} ({counts.mismatch})
            </TabsTrigger>
            <TabsTrigger value="untouched" className="text-xs px-3">
              {t("stockCheckItems.filterUntouched")} ({counts.untouched})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("stockCheckItems.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs gap-1">
                <MoreHorizontal className="size-3.5" /> {t("stockCheckItems.quickActions")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t("stockCheckItems.quickActions")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setExtraOpen(true)}>
                <PackagePlus className="size-3.5" /> {t("stockCheckItems.addUnexpected")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onBulkSet(PRODUCT_UNIT_STATUS.IN_STOCK)}>
                <Check className="size-3.5" /> {t("common.allInStock")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkSet(PRODUCT_UNIT_STATUS.LOST)}>
                <AlertCircle className="size-3.5" /> {t("common.allLost")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg" className="hidden"
          onChange={(e) => {
            const target = e.target
            const targetId = photoTargetRef.current
            photoTargetRef.current = null
            if (target.files?.[0] && targetId != null) {
              const file = target.files[0]
              upload(file, targetId).then((url) => {
                if (url) onUpdate(targetId, "photo", url)
              })
            }
            target.value = ""
          }}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="min-w-[120px]">{t("stockCheck.serial")}</TableHead>
              <TableHead className="min-w-[180px]">{t("stockCheck.product")}</TableHead>
              <TableHead className="w-24">{t("stockCheck.expected")}</TableHead>
              <TableHead className="w-64">{t("stockCheck.actual")}</TableHead>
              <TableHead className="w-28">{t("stockCheck.diff")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {t("stockCheck.noResult")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const diff = item.difference
                const isUnverified = item.actualStatus === UNVERIFIED_STATUS
                const hasWarnings = Boolean(item.suspectSeal) || Boolean(item.damagedPackaging) ||
                  (item.actualStatus === PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE && !item.photo)
                const rowClass =
                  isUnverified
                    ? "bg-muted/50"
                    : diff === STOCK_CHECK_DIFF.MISSING
                      ? "bg-red-50/40 dark:bg-red-950/10"
                      : diff === STOCK_CHECK_DIFF.SURPLUS
                        ? "bg-violet-50/40 dark:bg-violet-950/10"
                        : diff === STOCK_CHECK_DIFF.UNEXPECTED || diff === STOCK_CHECK_DIFF.PARTIAL_SHORTAGE
                          ? "bg-blue-50/40 dark:bg-blue-950/10"
                          : item.actualStatus == null
                            ? "bg-amber-50/60 dark:bg-amber-950/20"
                            : diff === STOCK_CHECK_DIFF.MATCH
                              ? "text-muted-foreground"
                              : ""
                const isSerialized = item.trackingType === TRACKING_TYPE.SERIALIZED
                return (
                  <TableRow key={item.id} className={cn("h-[52px]", rowClass)}>
                    <TableCell className="pr-0">
                      <WarningCell
                        item={item}
                        canEdit={canEdit}
                        onUpdate={onUpdate}
                        uploading={uploadingItemId === item.id}
                        onPickPhoto={() => {
                          photoTargetRef.current = item.id
                          fileRef.current?.click()
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.serialNumber || (item.trackingType === TRACKING_TYPE.BULK ? item.productSku : "—")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-medium truncate">{item.productName}</span>
                        {item.productSku && <span className="text-xs text-muted-foreground ml-1">{item.productSku}</span>}
                        <NoteCell item={item} canEdit={canEdit} onUpdate={onUpdate} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {isSerialized ? (
                        <span className="text-xs text-muted-foreground">
                          {item.expectedStatus ? statusLabels[item.expectedStatus] ?? item.expectedStatus : "—"}
                        </span>
                      ) : item.expectedQuantity != null ? (
                        <span className="text-xs font-medium tabular-nums">
                          {item.expectedQuantity}
                          {item.unit ? ` ${t(UNIT_LABELS[item.unit] ?? item.unit)}` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isUnverified ? (
                        <Badge variant="outline" className="text-xs border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">
                          {t("stockCheckItems.badgeUnverified")}
                        </Badge>
                      ) : canEdit ? (
                        <div className="flex items-center gap-1">
                          <Select key={`sel-${item.id}-${item.actualStatus ?? "null"}`}
                            value={item.actualStatus ?? "__unchecked__"}
                            onValueChange={(v) => {
                              if (v === "__unchecked__") {
                                onUpdate(item.id, "actualStatus", null)
                                if (isSerialized) {
                                  onUpdate(item.id, "countedQuantity", null)
                                }
                              } else {
                                onUpdate(item.id, "actualStatus", v)
                                if (isSerialized) {
                                  const lostStatuses: string[] = [PRODUCT_UNIT_STATUS.LOST, PRODUCT_UNIT_STATUS.REMOVED, PRODUCT_UNIT_STATUS.DISPOSED]
                                  onUpdate(item.id, "countedQuantity", lostStatuses.includes(v) ? 0 : 1)
                                }
                              }
                            }}
                          >
                            <SelectTrigger className={cn("h-8 text-xs flex-1", !item.actualStatus && "text-muted-foreground")}>
                              <SelectValue placeholder={t("stockCheckItems.unchecked")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unchecked__" className="text-muted-foreground italic">{t("stockCheckItems.unchecked")}</SelectItem>
                              {statusOptions.map((st) => (
                                <SelectItem key={st} value={st} className="text-xs">
                                  {statusLabels[st]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.trackingType === TRACKING_TYPE.BULK && (
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-20 text-right"
                              value={item.countedQuantity ?? ""}
                              onChange={(e) =>
                                onUpdate(item.id, "countedQuantity", e.target.value ? Number(e.target.value) : null)
                              }
                            />
                          )}
                          {diff === STOCK_CHECK_DIFF.SURPLUS && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {isSerialized ? item.countedQuantity ?? "—" : ""}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={cn(!item.actualStatus && "text-muted-foreground italic")}>
                            {item.actualStatus ? statusLabels[item.actualStatus] ?? item.actualStatus : t("stockCheckItems.unchecked")}
                          </span>
                          {item.trackingType === TRACKING_TYPE.BULK && item.countedQuantity != null && (
                            <span className="text-xs text-muted-foreground">×{item.countedQuantity}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <DiffBadge diff={diff} t={t} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={extraOpen} onOpenChange={setExtraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("stockCheckItems.addUnexpected")}</DialogTitle>
            <DialogDescription>{t("stockCheckItems.extraDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("stockCheckItems.extraSku")} *</label>
              <Input
                value={extraSku}
                onChange={(e) => setExtraSku(e.target.value)}
                placeholder="SKU-001"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("stockCheckItems.extraSerial")}</label>
              <Input
                value={extraSerial}
                onChange={(e) => setExtraSerial(e.target.value)}
                placeholder={t("stockCheckItems.extraSerialPlaceholder")}
                className="h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("stockCheckItems.extraQty")}</label>
              <Input
                type="number"
                min={0}
                value={extraQty}
                onChange={(e) => setExtraQty(e.target.value)}
                placeholder={t("stockCheckItems.extraQtyPlaceholder")}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("label.note")}</label>
              <Input
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                className="h-9"
              />
            </div>
            {extraError && <p className="text-xs text-destructive">{extraError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtraOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddExtra} disabled={extraPending}>
              {extraPending && <Loader2 className="size-4 animate-spin mr-1" />}
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WarningCell({
  item, canEdit, onUpdate, uploading, onPickPhoto,
}: {
  item: StockCheckItem
  canEdit: boolean
  onUpdate: (itemId: number, field: string, value: unknown) => void
  uploading: boolean
  onPickPhoto: () => void
}) {
  const { t } = useTranslation()
  const hasAny = Boolean(item.suspectSeal) || Boolean(item.damagedPackaging) ||
    (item.actualStatus === PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE && !item.photo)
  if (!hasAny) return <span className="inline-flex size-6" />
  const photoMissing = item.actualStatus === PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE && !item.photo
  return (
    <Popover>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-md border transition-colors",
                  photoMissing
                    ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30"
                    : "border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/30",
                )}
              >
                <AlertCircle className="size-4" />
              </button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>{t("stockCheckItems.warningTooltip")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-64 space-y-3 p-3">
        {canEdit && (
          <>
            <WarningToggle
              active={Boolean(item.suspectSeal)}
              icon={<ShieldAlert className="size-4" />}
              label={t("stockCheckItems.suspectSeal")}
              onClick={() => onUpdate(item.id, "suspectSeal", !item.suspectSeal)}
            />
            <WarningToggle
              active={Boolean(item.damagedPackaging)}
              icon={<PackageOpen className="size-4" />}
              label={t("stockCheckItems.damagedPackaging")}
              onClick={() => onUpdate(item.id, "damagedPackaging", !item.damagedPackaging)}
            />
            {item.actualStatus === PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE && (
              <WarningToggle
                active={Boolean(item.photo)}
                icon={uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                label={t("stockCheckItems.photoRequired")}
                onClick={onPickPhoto}
              />
            )}
          </>
        )}
        {!canEdit && (
          <div className="space-y-1.5 text-xs">
            {item.suspectSeal && <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><ShieldAlert className="size-3.5" /> {t("stockCheckItems.suspectSeal")}</p>}
            {item.damagedPackaging && <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><PackageOpen className="size-3.5" /> {t("stockCheckItems.damagedPackaging")}</p>}
            {photoMissing && <p className="text-red-600 dark:text-red-400 flex items-center gap-1.5"><Camera className="size-3.5" /> {t("stockCheckItems.photoMissing")}</p>}
            {item.photo && item.actualStatus === PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE && (
              <a href={item.photo} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Image className="size-3.5" /> {t("stockCheckItems.viewPhoto")}
              </a>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function WarningToggle({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors",
        active ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          : "border-input text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {active && <Check className="size-3.5 text-amber-600 dark:text-amber-400" />}
    </button>
  )
}

function NoteCell({ item, canEdit, onUpdate }: { item: StockCheckItem; canEdit: boolean; onUpdate: (itemId: number, field: string, value: unknown) => void }) {
  const { t } = useTranslation()
  const [note, setNote] = useState(item.note ?? "")
  return (
    <Popover>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                  item.note
                    ? "border-input bg-muted text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                <StickyNote className="size-3.5" />
                {item.note && <span className="absolute ml-2.5 mt-2.5 size-1.5 rounded-full bg-amber-500" />}
              </button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>{t("stockCheckItems.note")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("stockCheckItems.note")}</p>
          {canEdit ? (
            <>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-ring"
                value={note}
                placeholder={t("stockCheckItems.notePlaceholder")}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button size="sm" className="w-full text-xs" onClick={() => onUpdate(item.id, "note", note.trim() || null)}>
                {t("common.save")}
              </Button>
            </>
          ) : (
            <p className="text-sm leading-relaxed">{item.note || "—"}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DiffBadge({ diff, t }: { diff: string | null; t: (k: string) => string }) {
  if (!diff) return <span className="text-muted-foreground">—</span>
  if (diff === STOCK_CHECK_DIFF.MATCH) {
    return <Badge variant="secondary" className="text-xs">{t("stockCheckItems.diffMatch")}</Badge>
  }
  if (diff === STOCK_CHECK_DIFF.MISSING) {
    return <Badge variant="destructive" className="text-xs">{t("stockCheckItems.diffMissing")}</Badge>
  }
  if (diff === STOCK_CHECK_DIFF.SURPLUS) {
    return (
      <Badge variant="outline" className="text-xs border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">
        {t("stockCheckItems.diffSurplus")}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">
      {t("stockCheckItems.diffUnexpected")}
    </Badge>
  )
}