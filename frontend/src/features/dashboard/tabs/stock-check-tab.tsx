import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useStockCheckOverview } from "@/hooks/use-reports"
import { formatDateVN, toLocalDateStr, localDayStartUtc, localDayEndUtc } from "@/utils/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { DataTable } from "@/components/ui/data-table"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { StockCheckDiscrepancy } from "@/utils/types"

export function StockCheckTab() {
  const { t } = useTranslation()
  const chartConfig: ChartConfig = {
    checks: { label: t("dashboard.stockCheck.checks"), color: "hsl(var(--chart-1))" },
    lost: { label: t("dashboard.stockCheck.lost"), color: "hsl(var(--chart-6))" },
    found: { label: t("dashboard.stockCheck.found"), color: "hsl(var(--chart-3))" },
    damaged: { label: t("dashboard.stockCheck.damaged"), color: "hsl(var(--chart-5))" },
  }
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(toLocalDateStr(firstDay))
  const [to, setTo] = useState(toLocalDateStr(today))
  const { data, isLoading } = useStockCheckOverview(localDayStartUtc(from), localDayEndUtc(to))
  const adjData = useMemo(() => {
    const byMonth = new Map<string, { lost: number; found: number; damaged: number }>()
    for (const a of data?.adjustmentsPerMonth ?? []) {
      byMonth.set(a.month, { lost: a.lost, found: a.found, damaged: a.damaged })
    }
    const out: Array<{ month: string; lost: number; found: number; damaged: number }> = []
    for (const c of data?.checksPerMonth ?? []) {
      out.push({ month: c.month, ...(byMonth.get(c.month) ?? { lost: 0, found: 0, damaged: 0 }) })
    }
    for (const [month, v] of byMonth) {
      if (!out.some((o) => o.month === month)) out.push({ month, ...v })
    }
    return out.sort((a, b) => a.month.localeCompare(b.month))
  }, [data])
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">{t('dashboard.activity.from')}</Label>
          <DatePicker value={from} onChange={setFrom} max={to} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('dashboard.activity.to')}</Label>
          <DatePicker value={to} onChange={setTo} min={from} className="w-40" />
        </div>
      </div>
      {(data?.checksPerMonth?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.stockCheck.checksPerMonth')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-44">
              <BarChart data={data?.checksPerMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
      {adjData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.stockCheck.adjustmentsPerMonth')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-44">
              <BarChart data={adjData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="lost" stackId="a" fill="hsl(var(--chart-6))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="found" stackId="a" fill="hsl(var(--chart-3))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="damaged" stackId="a" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
      <DataTable<StockCheckDiscrepancy>
        columns={[
          { header: t('dashboard.stockCheck.code'), render: (d) => <span className="font-mono text-xs">{d.checkCode}</span> },
          { header: t('dashboard.stockCheck.date'), render: (d) => <span className="text-sm">{formatDateVN(d.createdAt)}</span> },
          { header: t('dashboard.stockCheck.missing'), className: "text-right", render: (d) => (
            <span className={`tabular-nums ${d.missingCount > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{d.missingCount}</span>
          )},
          { header: t('dashboard.stockCheck.unexpected'), className: "text-right", render: (d) => (
            <span className={`tabular-nums ${d.unexpectedCount > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>{d.unexpectedCount}</span>
          )},
          { header: "", render: (d) => (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2" asChild>
              <a href={`/stock/ops/checks/${d.id}`}>{t('dashboard.stockCheck.view')}</a>
            </Button>
          )},
        ]}
        data={data?.recentDiscrepancies ?? []}
        isLoading={false}
        emptyMessage={t('dashboard.stockCheck.empty')}
      />
    </div>
  )
}
