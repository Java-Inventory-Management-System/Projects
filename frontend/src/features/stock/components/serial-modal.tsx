import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

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
  const lines = text.split("\n").filter(Boolean)
  const count = lines.length
  const isComplete = count >= required

  useEffect(() => {
    if (open) setText(serials.join("\n"))
  }, [open, serials])

  const handleSave = () => {
    if (count < required) return
    onSave(lines)
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

        <div className="flex items-center gap-2 text-sm mb-2">
          <span className="text-muted-foreground">Đã nhập:</span>
          <span className={count >= required ? "font-semibold text-green-600" : "font-semibold text-amber-600"}>
            {count}/{required}
          </span>
          {isComplete ? (
            <CheckCircle2 className="size-4 text-green-600" />
          ) : (
            <AlertTriangle className="size-4 text-amber-600" />
          )}
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isComplete ? "bg-green-500" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(100, (count / required) * 100)}%` }}
          />
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập serial, mỗi serial trên một dòng..."
          className="h-48 font-mono text-xs"
        />

        <p className="text-xs text-muted-foreground">
          Dán từ Excel/CSV hoặc nhập tay. Mỗi dòng = 1 serial.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={count < required}>
            {count < required ? `Còn thiếu ${required - count} serial` : `Xác nhận ${count} serial`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
