import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2, XCircle, Upload, FileText } from "lucide-react"
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

const HEADER_PATTERN = /^(serial|sku|số.serial|stt|no|s\/n)\s*$/i

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

export const SerialModal = ({ open, onOpenChange, productName, productSku, required, serials, onSave }: SerialModalProps) => {
  const [text, setText] = useState(serials.join("\n"))
  const [fileImporting, setFileImporting] = useState(false)
  const [lastFileCount, setLastFileCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setText(serials.join("\n"))
      setLastFileCount(0)
    }
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

  const overCount = count > required
  const underCount = count < required
  const hasDuplicate = duplicateCount > 0

  let errorMsg = ""
  if (overCount) errorMsg = `Vượt quá ${count - required} serial so với số lượng`
  else if (underCount) errorMsg = `Còn thiếu ${required - count} serial`
  else if (hasDuplicate) errorMsg = `Có ${duplicateCount} dòng bị trùng serial`

  const showLargeText = rawLines.length > 200

  const canSave = count === required && !hasDuplicate

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
        const existing = new Set(text.split("\n").map((s) => s.trim()).filter(Boolean))
        const newSerials = imported.filter((s) => !existing.has(s))
        if (newSerials.length === 0) {
          toast.error("Tất cả serial trong file đã có trong danh sách")
          setFileImporting(false)
          return
        }
        const appended = text.trimEnd() + (text.trimEnd() ? "\n" : "") + newSerials.join("\n")
        setText(appended)
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
    onSave(validSerials)
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
          {required > 100 && <span className="text-xs text-muted-foreground ml-auto">Số lượng lớn, có thể dùng import file</span>}
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

        <div className="flex gap-2">
          {showLargeText ? (
            <div className="flex-1 rounded-md border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
              <FileText className="size-8 mx-auto mb-1 opacity-40" />
              <p>{rawLines.length} dòng serial</p>
              {lastFileCount > 0 && <p className="text-xs">Lần cuối: +{lastFileCount} serial từ file</p>}
              <p className="text-xs mt-1">Chỉnh sửa bằng cách nhập lại số lượng hoặc import file mới</p>
            </div>
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập serial, mỗi serial trên một dòng..."
              className={`flex-1 h-48 font-mono text-xs ${hasDuplicate ? "border-destructive" : ""}`}
            />
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1 text-xs"
              disabled={fileImporting}
              onClick={() => fileRef.current?.click()}
            >
              {fileImporting ? <Spinner className="size-3" /> : <Upload className="size-3" />}
              Import<br />file
            </Button>
          </div>
        </div>

        {errorMsg && (
          <p className={`text-xs ${hasDuplicate || overCount ? "text-destructive" : "text-muted-foreground"}`}>
            {errorMsg}
          </p>
        )}

        {lastFileCount > 0 && (
          <p className="text-xs text-muted-foreground">
            <CheckCircle2 className="size-3 inline mr-1 text-green-600" />
            Đã import {lastFileCount} serial từ file
            {showLargeText && " — textarea ẩn do số lượng lớn, nhấn Xác nhận để lưu"}
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
