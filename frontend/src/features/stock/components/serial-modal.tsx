import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

interface SerialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  productSku: string
  required: number
  serials: string[]
  onSave: (serials: string[]) => void
}

export function SerialModal({ open, onOpenChange, productName, productSku, required, serials, onSave }: SerialModalProps) {
  const [text, setText] = useState(serials.join("\n"))

  useEffect(() => {
    if (open) setText(serials.join("\n"))
  }, [open, serials])

  const rawLines = text.split("\n")
  const lines = useMemo(() => {
    const seen = new Set<string>()
    return rawLines.map((line, idx) => {
      const trimmed = line.trim()
      const isEmpty = trimmed === ""
      const isDuplicate = !isEmpty && seen.has(trimmed)
      if (!isEmpty) seen.add(trimmed)
      return { idx, trimmed, isEmpty, isDuplicate }
    })
  }, [rawLines])

  const validSerials = lines.filter((l) => !l.isEmpty && !l.isDuplicate).map((l) => l.trimmed)
  const count = validSerials.length
  const duplicateCount = lines.filter((l) => l.isDuplicate).length
  const isEmptyLine = lines.some((l) => l.isEmpty)

  const hasError = count !== required
  const overCount = count > required
  const underCount = count < required
  const hasDuplicate = duplicateCount > 0

  let errorMsg = ""
  if (overCount) errorMsg = `Vượt quá ${count - required} serial so với số lượng`
  else if (underCount) errorMsg = `Còn thiếu ${required - count} serial`
  else if (hasDuplicate) errorMsg = `Có ${duplicateCount} dòng bị trùng serial`
  else if (isEmptyLine) errorMsg = "Có dòng trống — sẽ bị bỏ qua khi lưu"

  const canSave = count === required && !hasDuplicate

  const handleSave = () => {
    if (!canSave) return
    onSave(validSerials)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Nhập serial</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {productName}
            <span className="font-mono ml-2">{productSku}</span>
          </p>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm mb-1">
          <span className="text-muted-foreground">Đã nhập:</span>
          <span className={
            count === required ? "font-semibold text-green-600"
            : overCount ? "font-semibold text-destructive"
            : "font-semibold text-amber-600"
          }>
            {count}/{required}
          </span>
          {count === required ? (
            <CheckCircle2 className="size-4 text-green-600" />
          ) : overCount ? (
            <XCircle className="size-4 text-destructive" />
          ) : (
            <AlertTriangle className="size-4 text-amber-600" />
          )}
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-300 ${
              count === required ? "bg-green-500"
              : overCount ? "bg-destructive"
              : count > required * 0.8 ? "bg-amber-500"
              : "bg-amber-300"
            }`}
            style={{ width: `${Math.min(100, (count / required) * 100)}%` }}
          />
        </div>

        {hasDuplicate && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive mb-2">
            <XCircle className="size-3 inline mr-1" />
            {duplicateCount} serial bị trùng. Vui lòng sửa hoặc xoá dòng trùng trước khi lưu.
          </div>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập serial, mỗi serial trên một dòng..."
          className={`h-48 font-mono text-xs ${hasDuplicate ? "border-destructive" : ""}`}
        />

        {errorMsg && (
          <p className={`text-xs ${hasDuplicate || overCount ? "text-destructive" : "text-muted-foreground"}`}>
            {errorMsg}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {overCount ? "Giảm số serial"
            : underCount ? `Còn thiếu ${required - count} serial`
            : hasDuplicate ? "Xoá dòng trùng"
            : `Xác nhận ${count} serial`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
