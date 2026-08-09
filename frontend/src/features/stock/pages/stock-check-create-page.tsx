import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createStockCheck } from "@/services/stock-check-service"
import http from "@/utils/http-client"
import { mapResponsePage } from "@/utils/mappers"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Info } from "lucide-react"
import { toast } from "@/utils/toast"
import type { StockCheckScopeType } from "@/utils/types"
import { BOX_STATUS } from "@/utils/types"

export const StockCheckCreatePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const [scopeType, setScopeType] = useState<StockCheckScopeType | "">((params.get("scopeType") as StockCheckScopeType | null) ?? "")
  const [scopeId, setScopeId] = useState<string>(params.get("scopeId") ?? "")
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
    enabled: scopeType === "ZONE",
  })

  const zones = useMemo(() => {
    if (!locations?.content) return []
    const seen = new Set<string>()
    return locations.content.filter((l) => {
      if (seen.has(l.zoneCode)) return false
      seen.add(l.zoneCode)
      return true
    }).map((l) => ({
      zoneCode: l.zoneCode,
      locationId: l.id,
      exampleFullCode: l.fullCode,
    }))
  }, [locations])

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await http.get("/catalog/category")
      return mapResponsePage(res, (r: unknown) => {
        const o = r as { id: number; name: string }
        return o
      })
    },
    enabled: scopeType === "CATEGORY",
  })

  const { data: boxes } = useQuery({
    queryKey: ["boxes", "all"],
    queryFn: async () => (await http.get("/box")) as unknown as Array<{ id: number; boxCode: string; locationCode: string | null; status: string }>,
    enabled: scopeType === "BOX",
  })

  const handleSubmit = () => {
    if (!scopeType || !scopeId) {
      toast.error(t("stockCheckCreate.requireScope"))
      return
    }
    createMut.mutate({
      scopeType: scopeType as StockCheckScopeType,
      scopeId: Number(scopeId),
      note: note || undefined,
    })
  }

  const createMut = useMutation({
    mutationFn: createStockCheck,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
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
          <Label>{t("stockCheckCreate.scopeType")}</Label>
          <Select value={scopeType} onValueChange={(v) => { setScopeType(v as StockCheckScopeType); setScopeId("") }}>
            <SelectTrigger>
              <SelectValue placeholder={t("stockCheckCreate.selectScopeType")} />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]">
              <SelectItem value="ZONE">{t("stockCheckCreate.zone")}</SelectItem>
              <SelectItem value="CATEGORY">{t("stockCheckCreate.category")}</SelectItem>
              <SelectItem value="BOX">{t("stockCheckCreate.box")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scopeType === "ZONE" && (
          <div className="space-y-2">
            <Label>{t("stockCheckCreate.zone")}</Label>
            {!locations ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={scopeId} onValueChange={setScopeId}>
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
        )}

        {scopeType === "CATEGORY" && (
          <div className="space-y-2">
            <Label>{t("stockCheckCreate.category")}</Label>
            {!categories ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("stockCheckCreate.selectCategory")} />
                </SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {(categories.content ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {scopeType === "BOX" && (
          <div className="space-y-2">
            <Label>{t("stockCheckCreate.box")}</Label>
            {!boxes ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("stockCheckCreate.selectBox")} />
                </SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {(boxes ?? []).filter((b) => b.status !== BOX_STATUS.SEALED).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.boxCode} ({b.locationCode ?? "—"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {scopeId && (
          <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
            <Info className="size-3.5" /> {t("stockCheckCreate.scopeHint")}
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
        <Button onClick={handleSubmit} disabled={createMut.isPending || !scopeType || !scopeId}>
          {createMut.isPending ? t("stockCheckCreate.creating") : t("stockCheckCreate.start")}
        </Button>
      </div>
    </div>
  )
}
