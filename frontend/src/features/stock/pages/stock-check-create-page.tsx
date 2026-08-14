import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createStockCheck, countUnitsInScope } from "@/services/stock-check-service"
import http from "@/utils/http-client"
import { mapResponsePage } from "@/utils/mappers"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Info } from "lucide-react"
import { toast } from "@/utils/toast"

export const StockCheckCreatePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [scopeId, setScopeId] = useState<string>("")
  const [binFrom, setBinFrom] = useState("")
  const [binTo, setBinTo] = useState("")
  const [note, setNote] = useState("")

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await http.get("/location", { params: { page: 0, size: 500 } })
      return mapResponsePage(res, (r: unknown) => {
        const o = r as { id: number; zoneCode: string; fullCode: string }
        return o
      })
    },
  })

  const zones = useMemo(() => {
    if (!locations?.content) return []
    const seen = new Set<string>()
    const zoneLocations = new Map<string, { locationId: number; binCodes: string[] }>()
    for (const l of locations.content) {
      if (seen.has(l.zoneCode)) {
        zoneLocations.get(l.zoneCode)!.binCodes.push(l.fullCode)
      } else {
        seen.add(l.zoneCode)
        zoneLocations.set(l.zoneCode, { locationId: l.id, binCodes: [l.fullCode] })
      }
    }
    return [...zoneLocations.entries()].map(([zoneCode, v]) => ({
      zoneCode,
      locationId: v.locationId,
      binCodes: [...new Set(v.binCodes)].sort(),
    }))
  }, [locations])

  const selectedZone = zones.find((z) => String(z.locationId) === scopeId)

  const { data: unitCount, isLoading: counting } = useQuery({
    queryKey: ["stock-check-unit-count", scopeId, binFrom, binTo],
    queryFn: () => countUnitsInScope("ZONE", Number(scopeId), binFrom || undefined, binTo || undefined),
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
      binFrom: binFrom || undefined,
      binTo: binTo || undefined,
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
            <Select value={scopeId} onValueChange={(v) => { setScopeId(v); setBinFrom(""); setBinTo("") }}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("stockCheckCreate.binFrom")}</Label>
                <Input
                  list={`bins-${selectedZone.zoneCode}`}
                  placeholder={selectedZone.binCodes[0] ?? "—"}
                  value={binFrom}
                  onChange={(e) => setBinFrom(e.target.value)}
                />
                <datalist id={`bins-${selectedZone.zoneCode}`}>
                  {selectedZone.binCodes.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>{t("stockCheckCreate.binTo")}</Label>
                <Input
                  list={`bins-${selectedZone.zoneCode}`}
                  placeholder={selectedZone.binCodes[selectedZone.binCodes.length - 1] ?? "—"}
                  value={binTo}
                  onChange={(e) => setBinTo(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("stockCheckCreate.binHint")}</p>
          </>
        )}

        {scopeId && (
          <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
            <Info className="size-3.5" />
            {counting
              ? t("stockCheckCreate.counting")
              : unitCount != null
                ? t("stockCheckCreate.countPreview", { count: unitCount })
                : t("stockCheckCreate.scopeHint")}
          </p>
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