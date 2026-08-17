import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createStockCheck,
  countUnitsInScope,
  getStockCheckSchedules,
} from "@/services/stock-check-service"
import http from "@/utils/http-client"
import { mapResponsePage } from "@/utils/mappers"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Info, Check, CalendarClock } from "lucide-react"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"

const DEFAULT_DUE_DAYS = 30

export const StockCheckCreatePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [scopeId, setScopeId] = useState<string>("")
  const [scopeMode, setScopeMode] = useState<"all" | "shelves">("all")
  const [selectedShelves, setSelectedShelves] = useState<string[]>([])
  const [note, setNote] = useState("")

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await http.get("/location", { params: { page: 0, size: 500 } })
      return mapResponsePage(res, (r: unknown) => {
        const o = r as { id: number; zoneCode: string; fullCode: string; shelfCode: string; lastCheckedAt: string | null }
        return o
      })
    },
  })

  const zones = useMemo(() => {
    if (!locations?.content) return []
    const seen = new Set<string>()
    const zoneLocations = new Map<string, {
      locationId: number
      shelfRange: string[]
      shelfChecked: Map<string, string>
    }>()
    for (const l of locations.content) {
      if (seen.has(l.zoneCode)) {
        const z = zoneLocations.get(l.zoneCode)!
        if (l.shelfCode && !z.shelfRange.includes(l.shelfCode)) z.shelfRange.push(l.shelfCode)
        if (l.shelfCode && l.lastCheckedAt && (z.shelfChecked.get(l.shelfCode) ?? "") < l.lastCheckedAt) {
          z.shelfChecked.set(l.shelfCode, l.lastCheckedAt)
        }
      } else {
        seen.add(l.zoneCode)
        zoneLocations.set(l.zoneCode, {
          locationId: l.id,
          shelfRange: l.shelfCode ? [l.shelfCode] : [],
          shelfChecked: l.shelfCode && l.lastCheckedAt ? new Map([[l.shelfCode, l.lastCheckedAt]]) : new Map(),
        })
      }
    }
    return [...zoneLocations.entries()].map(([zoneCode, v]) => ({
      zoneCode,
      locationId: v.locationId,
      shelfRange: [...new Set(v.shelfRange)].sort(),
      shelfChecked: v.shelfChecked,
    }))
  }, [locations])

  const selectedZone = zones.find((z) => String(z.locationId) === scopeId)

  const { data: schedules } = useQuery({
    queryKey: ["stock-check-schedules"],
    queryFn: getStockCheckSchedules,
  })

  const zoneSchedules = useMemo(
    () => (schedules ?? []).filter((s) => s.isActive && s.zoneCode === selectedZone?.zoneCode),
    [schedules, selectedZone],
  )

  const dueDays = zoneSchedules.length > 0
    ? Math.max(...zoneSchedules.map((s) => s.frequencyDays))
    : DEFAULT_DUE_DAYS

  const shelfDue = useMemo(() => {
    if (!selectedZone) return new Map<string, boolean>()
    const now = Date.now()
    const m = new Map<string, boolean>()
    for (const sh of selectedZone.shelfRange) {
      const last = selectedZone.shelfChecked.get(sh)
      const due = last == null || (now - new Date(last).getTime()) > dueDays * 86_400_000
      m.set(sh, due)
    }
    return m
  }, [selectedZone, dueDays])

  const dueCount = selectedZone ? [...shelfDue.values()].filter(Boolean).length : 0

  const pickZone = (v: string) => {
    setScopeId(v)
    setScopeMode("all")
    setSelectedShelves([])
  }

  const toggleShelf = (sh: string) => {
    setSelectedShelves((prev) => prev.includes(sh) ? prev.filter((x) => x !== sh) : [...prev, sh])
  }

  const applyShelves = (list: string[]) => {
    setSelectedShelves(list)
    setScopeMode("shelves")
  }

  const { data: unitCount, isLoading: counting } = useQuery({
    queryKey: ["stock-check-unit-count", scopeId, scopeMode, selectedShelves],
    queryFn: () => countUnitsInScope(
      "ZONE", Number(scopeId),
      scopeMode === "shelves" && selectedShelves.length > 0 ? [...selectedShelves].sort() : undefined,
    ),
    enabled: !!scopeId,
    staleTime: 30_000,
  })

  const handleSubmit = () => {
    if (!scopeId) {
      toast.error(t("stockCheckCreate.requireScope"))
      return
    }
    createMut.mutate({
      scopeType: "ZONE",
      scopeId: Number(scopeId),
      shelfCodes: scopeMode === "shelves" && selectedShelves.length > 0 ? [...selectedShelves].sort() : undefined,
      note: note || undefined,
    })
  }

  const createMut = useMutation({
    mutationFn: createStockCheck,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      qc.invalidateQueries({ queryKey: ["stock-check-zone-status"] })
      toast.success(t("stockCheckCreate.createSuccess"))
      navigate(`/stock/ops/checks/${res.id}`)
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckCreate.error")),
  })

  const shelves = selectedZone?.shelfRange ?? []

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/ops/checks")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("stockCheckCreate.title")}</h1>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-sm font-medium">{t("stockCheckCreate.scope")}</h2>

        <div className="space-y-2">
          <Label>{t("stockCheckCreate.zone")}</Label>
          {!locations ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={scopeId} onValueChange={pickZone}>
              <SelectTrigger>
                <SelectValue placeholder={t("stockCheckCreate.selectZone")} />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                {zones.map((z) => (
                  <SelectItem key={z.zoneCode} value={String(z.locationId)}>
                    {t("stockCheckCreate.zonePrefix")} {z.zoneCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedZone && (
          <>
            <RadioGroup value={scopeMode} onValueChange={(v) => setScopeMode(v as "all" | "shelves")} className="space-y-2">
              <label className="flex items-center gap-2 rounded-lg border border-input px-3 py-2.5 text-sm cursor-pointer">
                <RadioGroupItem value="all" id="scope-all" />
                <span>{t("stockCheckCreate.modeAll")}</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-input px-3 py-2.5 text-sm cursor-pointer">
                <RadioGroupItem value="shelves" id="scope-shelves" />
                <span>{t("stockCheckCreate.modeShelves")}</span>
              </label>
            </RadioGroup>

            {scopeMode === "shelves" && (
              <div className="space-y-2">
                <div className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
                  {shelves.map((sh) => {
                    const due = shelfDue.get(sh) ?? false
                    const last = selectedZone.shelfChecked.get(sh)
                    const active = selectedShelves.includes(sh)
                    return (
                      <button
                        key={sh}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-input hover:bg-muted",
                        )}
                        onClick={() => toggleShelf(sh)}
                      >
                        <span className={cn(
                          "inline-flex size-4 items-center justify-center rounded border text-transparent",
                          active && "border-primary bg-primary text-primary-foreground",
                        )}>
                          {active && <Check className="size-3" />}
                        </span>
                        <span className="font-mono text-xs">{sh}</span>
                        {due ? (
                          <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            {t("stockCheckCreate.shelfDue")}
                          </span>
                        ) : last ? (
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {t("stockCheckCreate.shelfCheckedAt", { date: fmtDate(last) })}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
                {dueCount > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("stockCheckCreate.dueNotice", { count: dueCount })}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-xs"
                    onClick={() => setSelectedShelves([...shelves])}>
                    {t("stockCheckCreate.selectAll")}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs"
                    onClick={() => setSelectedShelves([])}>
                    {t("stockCheckCreate.clearAll")}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs"
                    onClick={() => applyShelves(shelves.filter((sh) => shelfDue.get(sh)))}
                    disabled={dueCount === 0}>
                    {t("stockCheckCreate.selectDue")}
                  </Button>
                </div>
              </div>
            )}

            {zoneSchedules.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-dashed px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {t("stockCheckCreate.scheduleHint")}
                </p>
                {zoneSchedules.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs">
                      {s.shelfFrom ?? "—"} – {s.shelfTo ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("stockCheckCreate.scheduleEvery", { days: s.frequencyDays })}
                    </span>
                    <Button variant="outline" size="sm" className="ml-auto text-xs"
                      onClick={() => {
                        const range = shelves.filter(
                          (sh) => (!s.shelfFrom || sh >= s.shelfFrom) && (!s.shelfTo || sh <= s.shelfTo))
                        applyShelves(range.length > 0 ? range : [...shelves])
                      }}>
                      {t("stockCheckCreate.applySchedule")}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
              <Info className="size-3.5" />
              {counting
                ? t("stockCheckCreate.counting")
                : unitCount != null
                  ? t("stockCheckCreate.countPreview", { count: unitCount })
                  : t("stockCheckCreate.scopeHint")}
            </p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">{t("stockCheckCreate.note")}</Label>
        <Textarea
          id="note"
          placeholder={t("stockCheckCreate.notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/stock/ops/checks")}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={createMut.isPending || !scopeId}>
          {createMut.isPending ? t("stockCheckCreate.creating") : t("stockCheckCreate.start")}
        </Button>
      </div>
    </div>
  )
}