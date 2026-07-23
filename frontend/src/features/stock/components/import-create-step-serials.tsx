import { useState, useMemo } from "react"
import type { LineItem } from "@/utils/types"
import type { ItemAction } from "../reducers/import-create-reducer"
import { toast } from "@/utils/toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { SerialModal } from "@/features/stock/components/serial-modal"
import { ScanLine, CircleCheckBig, Circle, Trash2, ClipboardList } from "lucide-react"

interface Props {
  items: LineItem[]
  dispatch: React.Dispatch<ItemAction>
  isManager: boolean
}

export function ImportStepSerials({ items, dispatch, isManager }: Props) {
  const [serialModalOpen, setSerialModalOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<number | null>(null)
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")

  const activeItem = items.find((i) => i.tempId === activeItemId)

  const totalAmount = useMemo(() => items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [items])

  const totalSerials = useMemo(() => items.reduce((s, i) => s + i.serials.length, 0), [items])

  function removeItem(tempId: number) {
    dispatch({ type: "REMOVE_ITEM", tempId })
  }

  function saveSerials(tempId: number, serials: string[]) {
    dispatch({ type: "SAVE_SERIALS", tempId, serials })
  }

  function handlePasteSerials() {
    const lines = pasteText.split("\n").filter(Boolean)
    const matchedSkus = new Set(
      lines.filter((l) => l.includes(":")).map((l) => l.trim().toLowerCase().split(":")[0].trim()),
    )
    const parsed = items.filter((i) => matchedSkus.has(i.productSku.toLowerCase())).length
    dispatch({ type: "PASTE_SERIALS", pasteText })
    toast.success(`Đã gán serial cho ${parsed} sản phẩm`)
    if (parsed > 0) {
      setPasteDialogOpen(false)
      setPasteText("")
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">Bước 3/4 — Nhập serial</h2>

      {items.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Sản phẩm</TableHead>
                <TableHead className="w-20 text-right">SL</TableHead>
                {isManager && <TableHead className="w-28 text-right">Đơn giá</TableHead>}
                {isManager && <TableHead className="w-16 text-right">BH(th)</TableHead>}
                {isManager && <TableHead className="w-28 text-right">Thành tiền</TableHead>}
                <TableHead className="w-28 text-center">Serial</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const serialCount = item.serials.length
                const serialOk = serialCount === item.quantity
                return (
                  <TableRow key={item.tempId}>
                    <TableCell className="font-medium text-sm truncate max-w-[200px]" title={item.productName}>
                      <span className="inline-flex items-center gap-1.5">
                        {serialOk ? (
                          <CircleCheckBig className="size-4 shrink-0 text-green-600" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        {item.productName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{item.quantity}</TableCell>
                    {isManager && (
                      <TableCell className="text-right tabular-nums text-sm">
                        {item.unitPrice.toLocaleString("vi-VN")}₫
                      </TableCell>
                    )}
                    {isManager && <TableCell className="text-right text-sm">{item.warrantyMonths}</TableCell>}
                    {isManager && (
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫
                      </TableCell>
                    )}
                    <TableCell className="text-center">
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
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(item.tempId)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        {isManager && <span className="text-sm font-semibold">Tổng: {totalAmount.toLocaleString("vi-VN")}₫</span>}
        <p className="text-xs text-muted-foreground italic">
          Tổng serial cần nhập: {items.reduce((s, i) => s + i.quantity, 0)} &middot; Đã nhập: {totalSerials}
        </p>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setPasteDialogOpen(true)}>
          <ClipboardList className="size-3.5" />
          Dán serial hàng loạt
        </Button>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dán serial hàng loạt</DialogTitle>
            <DialogDescription>
              Mỗi dòng một sản phẩm: <code className="text-xs bg-muted px-1">SKU: serial1, serial2</code>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[200px] font-mono text-sm"
            placeholder={"SKU-001: SN240701-001, SN240701-002\nSKU-002: SN240701-003"}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasteDialogOpen(false)
                setPasteText("")
              }}
            >
              Hủy
            </Button>
            <Button onClick={handlePasteSerials} disabled={!pasteText.trim()}>
              Áp dụng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
