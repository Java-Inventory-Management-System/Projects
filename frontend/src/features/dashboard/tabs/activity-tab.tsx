import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useActivity } from "@/hooks/use-reports"
import { formatCompactVND, formatDateVN, toLocalDateStr, localDayStartUtc, localDayEndUtc } from "@/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { DataTable } from "@/components/ui/data-table"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import type { ActivityItem } from "@/utils/types"

function aggregateActivitySeries(data: ActivityItem[] | undefined, byValue = true) {
  if (!data) return []
  const map = new Map<string, { countImp: number; countExp: number; valImp: number; valExp: number }>()
  for (const a of data) {
    const day = toLocalDateStr(new Date(a.date))
    const entry = map.get(day) ?? { countImp: 0, countExp: 0, valImp: 0, valExp: 0 }
    if (a.type === "IMPORT") {
      entry.countImp += a.lineItems
      entry.valImp += a.totalAmount
    } else {
      entry.countExp += a.lineItems
      entry.valExp += a.totalAmount
    }
    map.set(day, entry)
  }
  const result = Array.from(map.entries())
    .map(([date, v]) => ({
      date,
      importValue: v.valImp,
      exportValue: v.valExp,
      importCount: v.countImp,
      exportCount: v.countExp,
      ...(byValue ? { import: v.valImp, export: v.valExp } : { import: v.countImp, export: v.countExp }),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  return result
}

export function ActivityTab() {
  const { t } = useTranslation()
  const activityChartConfig: ChartConfig = {
    imports: { label: t("dashboard.activity.import"), color: "hsl(var(--chart-1))" },
    exports: { label: t("dashboard.activity.export"), color: "hsl(var(--chart-6))" },
  }
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(toLocalDateStr(firstDay))
  const [to, setTo] = useState(toLocalDateStr(today))
  const [byValue, setByValue] = useState(true)
  const [actPage, setActPage] = useState(0)
  const actPageSize = 20
  const { data, isLoading } = useActivity(localDayStartUtc(from), localDayEndUtc(to))
  const series = useMemo(() => aggregateActivitySeries(data, byValue), [data, byValue])
  const totalActElements = data?.length ?? 0
  const totalActPages = Math.max(1, Math.ceil(totalActElements / actPageSize))
  const actData = useMemo(() => {
    if (!data) return []
    return data.slice(actPage * actPageSize, (actPage + 1) * actPageSize)
  }, [data, actPage])
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">{t('dashboard.activity.from')}</Label>
          <DatePicker
            value={from}
            onChange={(v) => { setFrom(v); setActPage(0) }}
            max={to}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('dashboard.activity.to')}</Label>
          <DatePicker
            value={to}
            onChange={(v) => { setTo(v); setActPage(0) }}
            min={from}
            className="w-40"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setByValue((v) => !v); setActPage(0) }}>
          {byValue ? t('dashboard.activity.byQuantity') : t('dashboard.activity.byValue')}
        </Button>
      </div>
      {series.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.activity.importExport', { byValue: byValue ? t('dashboard.activity.byValue') : t('dashboard.activity.byQuantity') })}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={activityChartConfig} className="aspect-auto h-56">
              <BarChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v: string) => formatDateVN(v)} tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={byValue ? (v: number) => formatCompactVND(v) : undefined} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="import" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="export" fill="hsl(var(--chart-6))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
      <DataTable<ActivityItem>
        columns={[
          { header: t('dashboard.activity.type'), render: (a) => (
            <Badge variant={a.type === "IMPORT" ? "default" : "secondary"}>
              {a.type === "IMPORT" ? t('dashboard.activity.import') : t('dashboard.activity.export')}
            </Badge>
          )},
          { header: t('dashboard.activity.code'), render: (a) => <span className="font-mono text-xs">{a.receiptCode}</span> },
          { header: t('dashboard.activity.date'), render: (a) => <span className="text-sm">{formatDateVN(a.date)}</span> },
          { header: t('dashboard.activity.partner'), render: (a) => <span className="text-sm">{a.counterpartyName ?? "—"}</span> },
          { header: t('dashboard.activity.lines'), className: "text-right", render: (a) => <span className="tabular-nums">{a.lineItems}</span> },
          { header: t('dashboard.activity.totalAmount'), className: "text-right", render: (a) => <span className="tabular-nums">{a.totalAmount?.toLocaleString("vi-VN") ?? "0"}₫</span> },
        ]}
        data={actData}
        isLoading={isLoading}
        emptyMessage={t('dashboard.activity.noActivity')}
        totalElements={totalActElements}
        page={actPage}
        totalPages={totalActPages}
        onPageChange={setActPage}
      />
    </div>
  )
}
