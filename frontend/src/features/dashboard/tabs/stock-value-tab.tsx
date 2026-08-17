import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts"
import { useStockValue } from "@/hooks/use-reports"
import { formatCompactVND } from "@/utils/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { DataTable } from "@/components/ui/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { downloadCsv } from "@/utils/download-csv"
import type { StockValueItem } from "@/utils/types"
import { FileDown } from "lucide-react"

function computePareto(data: StockValueItem[] | undefined) {
  if (!data || data.length === 0) return []
  const sorted = [...data].sort((a, b) => b.totalValue - a.totalValue)
  const total = sorted.reduce((s, i) => s + i.totalValue, 0)
  let acc = 0
  return sorted.map((i) => {
    acc += i.totalValue
    return {
      name: i.productName,
      sku: i.productSku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      value: i.totalValue,
      cumulativePercent: total > 0 ? (acc / total) * 100 : 0,
    }
  })
}

export function StockValueTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useStockValue()
  const [svPage, setSvPage] = useState(0)
  const svPageSize = 20
  const paretoConfig: ChartConfig = {
    value: { label: t("dashboard.stockValue.value") },
    cumulative: { label: t("dashboard.stockValue.cumulative") },
  }
  const paretoData = useMemo(() => computePareto(data), [data])
  const totalSvElements = data?.length ?? 0
  const totalSvPages = Math.max(1, Math.ceil(totalSvElements / svPageSize))
  const svData = useMemo(() => {
    if (!data) return []
    return data.slice(svPage * svPageSize, (svPage + 1) * svPageSize)
  }, [data, svPage])
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      {paretoData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.stockValue.abcAnalysis')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={paretoConfig} className="aspect-auto h-80">
              <ComposedChart data={paretoData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={10}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  tickFormatter={(v: number) => formatCompactVND(v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => v + "%"}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md text-xs space-y-1 max-w-[260px]">
                        <p className="font-medium">{d?.name}</p>
                        {d?.sku && <p className="text-muted-foreground">SKU: {d.sku}</p>}
                        <p>{t('dashboard.stockValue.stockQty')}: <span className="tabular-nums">{d?.quantity}</span></p>
                        <p>{t('dashboard.stockValue.unitPrice')}: <span className="tabular-nums">{d?.unitPrice?.toLocaleString("vi-VN") ?? "—"}₫</span></p>
                        <p>{t('dashboard.stockValue.totalValue')}: <span className="tabular-nums">{formatCompactVND(d?.value ?? 0)}₫</span></p>
                        <p>{t('dashboard.stockValue.cumulative')}: <span className="tabular-nums">{Number(d?.cumulativePercent ?? 0).toFixed(1)}%</span></p>
                      </div>
                    )
                  }}
                />
                <Bar yAxisId="left" dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulativePercent" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
                <ReferenceLine yAxisId="right" y={80} stroke="hsl(var(--chart-5))" strokeDasharray="4 4" label={{ value: "80%", position: "right", fontSize: 11, fill: "hsl(var(--chart-5))" }} />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            if (!data) return
            downloadCsv(
              "gia-tri-ton.csv",
              [t('table.sku'), t('table.product'), t('dashboard.stockValue.category'), t('dashboard.stockValue.qty'), t('dashboard.stockValue.unitPrice'), t('dashboard.stockValue.totalValue')],
              data.map((i) => [
                i.productSku ?? "",
                i.productName,
                i.categoryName ?? "—",
                String(i.quantity),
                String(i.unitPrice),
                String(i.totalValue),
              ]),
            )
          }}
          disabled={!data}
        >
          <FileDown className="size-3" /> CSV
        </Button>
      </div>
      <DataTable<StockValueItem>
        columns={[
          { header: t('table.sku'), render: (i) => <span className="font-mono text-xs">{i.productSku}</span> },
          { header: t('table.product'), render: (i) => <span className="text-sm">{i.productName}</span> },
          { header: t('dashboard.stockValue.category'), render: (i) => <span className="text-sm">{i.categoryName ?? "—"}</span> },
          { header: t('dashboard.stockValue.qty'), className: "text-right", render: (i) => <span className="tabular-nums">{i.quantity}</span> },
          { header: t('dashboard.stockValue.unitPrice'), className: "text-right", render: (i) => <span className="tabular-nums">{i.unitPrice?.toLocaleString("vi-VN") ?? "0"}₫</span> },
          { header: t('dashboard.stockValue.totalValue'), className: "text-right", render: (i) => <span className="tabular-nums">{i.totalValue?.toLocaleString("vi-VN") ?? "0"}₫</span> },
        ]}
        data={svData}
        isLoading={isLoading}
        emptyMessage={t('dashboard.stockValue.noData')}
        totalElements={totalSvElements}
        page={svPage}
        totalPages={totalSvPages}
        onPageChange={setSvPage}
      />
    </div>
  )
}
