import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { LineItem, QcRecord } from "@/utils/types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

interface Props {
  items: LineItem[]
  note: string
  setNote: (v: string) => void
  onQcStatus: (status: { hasRecords: boolean; done: boolean }) => void
  onQcRecordsChange?: (records: QcRecord[]) => void
}

export function ImportStepQc({ items, note, setNote, onQcStatus, onQcRecordsChange }: Props) {
  const { t } = useTranslation()
  const allSerials = useMemo(
    () =>
      items
        .filter((i) => i.itemStatus !== "NOT_RECEIVED")
        .flatMap((i) => i.serials.map((s) => ({ serial: s, productName: i.productName }))),
    [items],
  )

  const serialSet = useMemo(() => new Set(allSerials.map((s) => s.serial)), [allSerials])

  const [qcRecords, setQcRecords] = useState<QcRecord[]>([])

  useEffect(() => {
    setQcRecords((prev) => {
      const prevMap = new Map(prev.map((r) => [r.serial, r]))
      const synced: QcRecord[] = []
      let changed = false
      for (const s of allSerials) {
        const existing = prevMap.get(s.serial)
        if (existing) {
          synced.push(existing)
        } else {
          synced.push({ serial: s.serial, productName: s.productName, passed: true, failReason: "" })
          changed = true
        }
      }
      const prevCount = prev.length - synced.length
      if (prevCount > 0) changed = true
      return changed ? synced : prev
    })
  }, [allSerials, serialSet])

  useEffect(() => {
    onQcStatus({
      hasRecords: qcRecords.length > 0,
      done: qcRecords.length > 0 && qcRecords.every((r) => r.passed || r.failReason.trim().length > 0),
    })
    onQcRecordsChange?.(qcRecords)
  }, [qcRecords, onQcStatus, onQcRecordsChange])

  const qcFailed = qcRecords.filter((r) => !r.passed)
  const checkedCount = qcRecords.filter((r) => r.failReason || r.passed).length

  function updateQc(serial: string, field: keyof QcRecord, value: boolean | string) {
    setQcRecords((prev) => prev.map((r) => (r.serial === serial ? { ...r, [field]: value } : r)))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{t("importStepQc.heading")}</h2>

      {qcRecords.length > 0 && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t("importStepQc.progress")}</span>
            <span className="text-muted-foreground">
              {checkedCount}/{qcRecords.length} serial
            </span>
          </div>
          <Progress value={qcRecords.length > 0 ? (checkedCount / qcRecords.length) * 100 : 0} className="mt-2" />
        </div>
      )}

      {qcRecords.length === 0 && allSerials.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {t("importStepQc.noSerials")}
        </div>
      )}

      {qcRecords.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {qcRecords.map((rec, idx) => (
            <div key={rec.serial} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground w-6 shrink-0">{idx + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-mono truncate">{rec.serial}</p>
                  <p className="text-xs text-muted-foreground">{rec.productName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={rec.passed ? "default" : "outline"}
                  size="sm"
                  className="gap-1 text-xs h-8"
                  onClick={() => updateQc(rec.serial, "passed", true)}
                >
                  {t("importStepQc.pass")}
                </Button>
                <Button
                  variant={!rec.passed ? "destructive" : "outline"}
                  size="sm"
                  className="gap-1 text-xs h-8"
                  onClick={() => updateQc(rec.serial, "passed", false)}
                >
                  {t("importStepQc.fail")}
                </Button>
              </div>
              {!rec.passed && (
                <div className="w-48 shrink-0">
                  <Input
                    placeholder={t("importStepQc.failReasonPlaceholder")}
                    className="h-8 text-xs"
                    value={rec.failReason}
                    onChange={(e) => updateQc(rec.serial, "failReason", e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {qcFailed.length > 0 && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-medium text-destructive">
            {t("importStepQc.failWarning", { count: qcFailed.length })}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="note-step4">{t("importStepQc.noteLabel")}</Label>
        <Textarea
          id="note-step4"
          placeholder={t("importStepQc.notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <MapPin className="size-4 shrink-0 mt-0.5" />
        <span>
          <strong>{t("importStepQc.locationHint")}</strong> {t("importStepQc.locationHintDesc")}
        </span>
      </div>
    </div>
  )
}
