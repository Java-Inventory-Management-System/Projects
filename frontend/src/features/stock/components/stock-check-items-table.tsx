import { useRef } from "react"
import { PRODUCT_UNIT_STATUS, STOCK_CHECK_DIFF, type StockCheckItem } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Upload } from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
const statusOptions = [
  PRODUCT_UNIT_STATUS.IN_STOCK,
  PRODUCT_UNIT_STATUS.DEFECTIVE,
  PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE,
  PRODUCT_UNIT_STATUS.LOST,
  PRODUCT_UNIT_STATUS.REMOVED,
  PRODUCT_UNIT_STATUS.DISPOSED,
] as const

const statusLabels: Record<string, string> = {
  [PRODUCT_UNIT_STATUS.IN_STOCK]: "In Stock",
  [PRODUCT_UNIT_STATUS.DEFECTIVE]: "Defective",
  [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: "Damaged",
  [PRODUCT_UNIT_STATUS.LOST]: "Lost",
  [PRODUCT_UNIT_STATUS.REMOVED]: "Removed",
  [PRODUCT_UNIT_STATUS.DISPOSED]: "Disposed",
}

const diffLabels: Record<string, string> = {
  [STOCK_CHECK_DIFF.MATCH]: "Match",
  [STOCK_CHECK_DIFF.MISSING]: "Missing",
  [STOCK_CHECK_DIFF.UNEXPECTED]: "Unexpected",
  [STOCK_CHECK_DIFF.PARTIAL_SHORTAGE]: "Partial",
}

interface Props {
  items: StockCheckItem[]
  canEdit: boolean
  onUpdate: (itemId: number, field: string, value: unknown) => void
  onBulkSet: (status: string) => void
  searchQuery: string
  onSearchChange: (v: string) => void
  onImportSerials: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function StockCheckItemsTable({
  items,
  canEdit,
  onUpdate,
  onBulkSet,
  searchQuery,
  onSearchChange,
  onImportSerials,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const mismatchCount = items.filter((i) => i.difference && i.difference !== STOCK_CHECK_DIFF.MATCH).length

  const filtered = items.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.serialNumber.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      (item.productSku ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by serial, product, SKU..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        {mismatchCount > 0 && <span className="text-xs text-destructive">{mismatchCount} mismatch</span>}
        {canEdit && (
          <ButtonGroup>
            <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={onImportSerials} />
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => fileRef.current?.click()}>
              <Upload className="size-3" /> Import serials
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onBulkSet(PRODUCT_UNIT_STATUS.IN_STOCK)}
            >
              All In Stock
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onBulkSet(PRODUCT_UNIT_STATUS.LOST)}>
              All Lost
            </Button>
          </ButtonGroup>
        )}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Serial</TableHead>
              <TableHead className="min-w-[160px]">Product</TableHead>
              <TableHead className="w-24">Expected</TableHead>
              <TableHead className="w-40">Actual</TableHead>
              <TableHead className="w-20 text-right">Count</TableHead>
              <TableHead className="w-24">Diff</TableHead>
              <TableHead className="min-w-[140px]">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No matching items
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
                      : diff === STOCK_CHECK_DIFF.MATCH
                        ? "text-muted-foreground"
                        : ""
                return (
                  <TableRow key={item.id} className={rowClass}>
                    <TableCell className="font-mono text-xs">{item.serialNumber}</TableCell>
                    <TableCell>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-xs text-muted-foreground ml-1">{item.productSku}</span>
                    </TableCell>
                    <TableCell>{item.expectedStatus}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={item.actualStatus ?? ""}
                          onValueChange={(v) => onUpdate(item.id, "actualStatus", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((st) => (
                              <SelectItem key={st} value={st} className="text-xs">
                                {statusLabels[st]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        (item.actualStatus ?? "—")
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit ? (
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
                        (item.countedQuantity ?? "—")
                      )}
                    </TableCell>
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
                        (item.note ?? "—")
                      )}
                    </TableCell>
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
