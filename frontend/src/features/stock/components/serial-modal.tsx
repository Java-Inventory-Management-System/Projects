import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChipInput } from "@/components/ui/chip-input"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2, XCircle, Upload, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "@/utils/toast"

interface SerialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  productSku: string
  required: number
  serials: string[]
  onSave: (serials: string[]) => void
}

const HEADER_PATTERN = /^(serial|sku|số\.serial|stt|no|s\/n)\s*$/i

function parseFileContent(content: string): string[] {
  const raw = content.replace(/^\uFEFF/, "")
  const lines = raw.split(/[\n\r]+/)
  const skipHeader = lines.length > 0 && HEADER_PATTERN.test(lines[0].trim())
  const start = skipHeader ? 1 : 0
  const result: string[] = []
  for (let i = start; i < lines.length; i++) {
    const cell = lines[i].split(",")[0].split(";")[0].trim()
    if (cell.length > 0) result.push(cell)
  }
  return result
}

const VISIBLE_LIMIT = 50

export const SerialModal = ({
  open,
  onOpenChange,
  productName,
  productSku,
  required,
  serials,
  onSave,
}: SerialModalProps) => {
  const [chips, setChips] = useState<string[]>(serials)
  const [fileImporting, setFileImporting] = useState(false)
  const [lastFileCount, setLastFileCount] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setChips(serials)
      setLastFileCount(0)
      setShowAll(false)
    }
  }, [open, serials])

  const count = chips.length
  const overCount = count > required
  const underCount = count < required
  const truncated = chips.length > VISIBLE_LIMIT

  let errorMsg = ""
  if (overCount) errorMsg = `Vượt quá ${count - required} serial so với số lượng`
  else if (underCount) errorMsg = `Còn thiếu ${required - count} serial`

  const canSave = count === required

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileImporting(true)
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      setTimeout(() => {
        const imported = parseFileContent(content)
        if (imported.length === 0) {
          toast.error("File không có serial hợp lệ")
          setFileImporting(false)
          return
        }
        const newSerials = imported.filter((s) => !chips.includes(s))
        if (newSerials.length === 0) {
          toast.error("Tất cả serial trong file đã có trong danh sách")
          setFileImporting(false)
          return
        }
        setChips((prev) => [...prev, ...newSerials])
        setLastFileCount(newSerials.length)
        setFileImporting(false)
        toast.success(`Đã thêm ${newSerials.length} serial từ file`)
      }, 0)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleSave = () => {
    if (!canSave) return
    onSave(chips)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Nhập serial</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {productName}
            <span className="font-mono ml-2">{productSku}</span>
          </p>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm mb-1">
          <span className="text-muted-foreground">Đã nhập:</span>
          <span
            className={
              count === required
                ? "font-semibold text-green-600"
                : overCount
                  ? "font-semibold text-destructive"
                  : "font-semibold text-amber-600"
            }
          >
            {count}/{required}
          </span>
          {count === required ? (
            <CheckCircle2 className="size-4 text-green-600" />
          ) : overCount ? (
            <XCircle className="size-4 text-destructive" />
          ) : (
            <AlertTriangle className="size-4 text-amber-600" />
          )}
          {required > 100 && (
            <span className="text-xs text-muted-foreground ml-auto">Số lượng lớn, có thể dùng import file</span>
          )}
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-300 ${
              count === required
                ? "bg-green-500"
                : overCount
                  ? "bg-destructive"
                  : count > required * 0.8
                    ? "bg-amber-500"
                    : "bg-amber-300"
            }`}
            style={{ width: `${Math.min(100, (count / required) * 100)}%` }}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <ChipInput
              value={chips}
              onChange={setChips}
              onDuplicate={(v) => toast.error(`${v} đã có trong danh sách`)}
              placeholder="Nhập serial, Enter để thêm..."
            />
            {truncated && !showAll && (
              <p className="text-xs text-muted-foreground">
                và {chips.length - VISIBLE_LIMIT} serial khác
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFile} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1 text-xs"
              disabled={fileImporting}
              onClick={() => fileRef.current?.click()}
            >
              {fileImporting ? <Spinner className="size-3" /> : <Upload className="size-3" />}
              Import
              <br />
              file
            </Button>
          </div>
        </div>

        {truncated && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="size-3" /> Thu gọn
              </>
            ) : (
              <>
                <ChevronDown className="size-3" /> Xem tất cả {chips.length} serial
              </>
            )}
          </Button>
        )}

        {lastFileCount > 0 && (
          <p className="text-xs text-muted-foreground">
            <CheckCircle2 className="size-3 inline mr-1 text-green-600" />
            Đã import {lastFileCount} serial từ file
          </p>
        )}

        {errorMsg && (
          <p className={`text-xs ${overCount ? "text-destructive" : "text-muted-foreground"}`}>
            {errorMsg}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {overCount
              ? "Giảm số serial"
              : underCount
                ? `Còn thiếu ${required - count} serial`
                : `Xác nhận ${count} serial`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
