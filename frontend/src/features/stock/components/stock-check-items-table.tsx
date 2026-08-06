import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { PRODUCT_UNIT_STATUS, STOCK_CHECK_DIFF, TRACKING_TYPE, type StockCheckItem } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Upload, Camera, Image, Loader2 } from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/utils/cn"
import { useFileUpload } from "@/hooks/use-file-upload"

interface Props {
  items: StockCheckItem[]
  canEdit: boolean
  onUpdate: (itemId: number, field: string, value: unknown) => void
  onBulkSet: (status: string) => void
  searchQuery: string
  onSearchChange: (v: string) => void
  onImportSerials: (e: React.ChangeEvent<HTMLInputElement>) => void
  rowAction?: (item: StockCheckItem) => React.ReactNode
}

export function StockCheckItemsTable({
  items,
  canEdit,
  onUpdate,
  onBulkSet,
  searchQuery,
  onSearchChange,
  onImportSerials,
  rowAction,
}: Props) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const photoTargetRef = useRef<number | null>(null)
  const mismatchCount = items.filter((i) => i.difference && i.difference !== STOCK_CHECK_DIFF.MATCH).length
  const { upload, uploadingItemId } = useFileUpload()

  const statusOptions = [
    PRODUCT_UNIT_STATUS.IN_STOCK,
    PRODUCT_UNIT_STATUS.DEFECTIVE,
    PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE,
    PRODUCT_UNIT_STATUS.LOST,
    PRODUCT_UNIT_STATUS.REMOVED,
    PRODUCT_UNIT_STATUS.DISPOSED,
  ] as const

  const statusLabels: Record<string, string> = {
    [PRODUCT_UNIT_STATUS.IN_STOCK]: t("stockCheckItems.statusInStock"),
    [PRODUCT_UNIT_STATUS.DEFECTIVE]: t("stockCheckItems.statusDefective"),
    [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: t("stockCheckItems.statusDamagedInStorage"),
    [PRODUCT_UNIT_STATUS.LOST]: t("stockCheckItems.statusLost"),
    [PRODUCT_UNIT_STATUS.REMOVED]: t("stockCheckItems.statusRemoved"),
    [PRODUCT_UNIT_STATUS.DISPOSED]: t("stockCheckItems.statusDisposed"),
  }

  const diffLabels: Record<string, string> = {
    [STOCK_CHECK_DIFF.MATCH]: t("stockCheckItems.diffMatch"),
    [STOCK_CHECK_DIFF.MISSING]: t("stockCheckItems.diffMissing"),
    [STOCK_CHECK_DIFF.UNEXPECTED]: t("stockCheckItems.diffUnexpected"),
    [STOCK_CHECK_DIFF.PARTIAL_SHORTAGE]: t("stockCheckItems.diffPartialShortage"),
  }

  const filtered = items.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.serialNumber.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      (item.productSku ?? "").toLowerCase().includes(q)
    )
  })

  const hasBulk = filtered.some((i) => i.trackingType === TRACKING_TYPE.BULK)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("stockCheckItems.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        {mismatchCount > 0 && <span className="text-xs text-destructive">{t("stockCheckItems.mismatchCount", { count: mismatchCount })}</span>}
        {canEdit && (
          <ButtonGroup>
            <input ref={fileRef} type="file" accept=".txt,.csv,.png,.jpg,.jpeg" className="hidden"
              onChange={(e) => {
                const target = e.target
                const targetId = photoTargetRef.current
                photoTargetRef.current = null
                if (target.files?.[0] && targetId != null) {
                  const file = target.files[0]
                  upload(file, targetId).then((url) => {
                    if (url) onUpdate(targetId, "photo", url)
                  })
                } else if (target.files?.[0]) {
                  onImportSerials(e)
                }
                target.value = ""
              }}
            />
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
              photoTargetRef.current = null
              fileRef.current?.click()
            }}>
              <Upload className="size-3" /> {t('common.importSerials')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onBulkSet(PRODUCT_UNIT_STATUS.IN_STOCK)}
            >
              {t('common.allInStock')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onBulkSet(PRODUCT_UNIT_STATUS.LOST)}>
              {t('common.allLost')}
            </Button>
          </ButtonGroup>
        )}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">{t('stockCheck.serial')}</TableHead>
              <TableHead className="min-w-[160px]">{t('stockCheck.product')}</TableHead>
              <TableHead className="w-24">{t('stockCheck.expected')}</TableHead>
              <TableHead className="w-44">{t('stockCheck.actual')}</TableHead>
              {hasBulk && <TableHead className="w-20 text-right">{t('stockCheck.count')}</TableHead>}
              <TableHead className="w-24">{t('stockCheck.diff')}</TableHead>
              <TableHead className="min-w-[140px]">{t('stockCheck.note')}</TableHead>
              {rowAction && <TableHead className="w-28">{t('stockCheckItems.box')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(hasBulk ? 7 : 6) + (rowAction ? 1 : 0)} className="text-center text-muted-foreground py-8">
                  {t('stockCheck.noResult')}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const diff = item.difference
                const rowClass =
                  diff === STOCK_CHECK_DIFF.MISSING
                    ? "bg-red-50/40 dark:bg-red-950/10"
                    : diff === STOCK_CHECK_DIFF.UNEXPECTED
                      ? "bg-green-50/40 dark:bg-green-950/10"
                      : item.actualStatus == null
                        ? "bg-amber-50/60 dark:bg-amber-950/20"
                        : diff === STOCK_CHECK_DIFF.MATCH
                          ? "text-muted-foreground"
                          : ""
                const isSerialized = item.trackingType === TRACKING_TYPE.SERIALIZED
                return (
                  <TableRow key={item.id} className={rowClass}>
                    <TableCell className="font-mono text-xs">{item.serialNumber}</TableCell>
                    <TableCell>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-xs text-muted-foreground ml-1">{item.productSku}</span>
                      {item.autoFilled && (
                        <Badge variant="outline" className="ml-2 text-[10px] text-muted-foreground">{t("stockCheckItems.autoFilled")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{item.expectedStatus}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEdit ? (
                          <>
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
                            {item.actualStatus === PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE && (
                              <Button
                                type="button"
                                variant={item.photo ? "default" : "outline"}
                                size="icon"
                                className="size-8 shrink-0"
                                disabled={uploadingItemId === item.id}
                                onClick={() => {
                                  photoTargetRef.current = item.id
                                  fileRef.current?.click()
                                }}
                              >
                                {uploadingItemId === item.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : item.photo ? (
                                  <Image className="size-3.5" />
                                ) : (
                                  <Camera className="size-3.5" />
                                )}
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className={cn(!item.actualStatus && "text-muted-foreground italic")}>
                            {item.actualStatus ? statusLabels[item.actualStatus] ?? item.actualStatus : t("stockCheckItems.unchecked")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {hasBulk && (
                      <TableCell className="text-right">
                        {isSerialized ? (
                          <span className="text-xs text-muted-foreground">
                            {item.countedQuantity ?? "—"}
                          </span>
                        ) : canEdit ? (
                          <Input
                            type="number"
                            min={0}
                            className="h-8 w-20 text-right"
                            value={item.countedQuantity ?? ""}
                            onChange={(e) =>
                              onUpdate(item.id, "countedQuantity", e.target.value ? Number(e.target.value) : null)
                            }
                          />
                        ) : (
                          <span>{item.countedQuantity ?? "—"}</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {item.difference ? (
                        <Badge
                          variant={
                            item.difference === STOCK_CHECK_DIFF.MATCH
                              ? "secondary"
                              : item.difference === STOCK_CHECK_DIFF.MISSING
                                ? "destructive"
                                : item.difference === STOCK_CHECK_DIFF.UNEXPECTED
                                  ? "default"
                                  : "outline"
                          }
                          className="text-xs"
                        >
                          {diffLabels[item.difference] ?? item.difference}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input
                          className="h-8 text-xs"
                          value={item.note ?? ""}
                          onChange={(e) => onUpdate(item.id, "note", e.target.value || null)}
                        />
                      ) : (
                        <span className="text-xs">{item.note ?? "—"}</span>
                      )}
                    </TableCell>
                    {rowAction && <TableCell>{rowAction(item)}</TableCell>}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}