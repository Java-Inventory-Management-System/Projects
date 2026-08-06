import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useInventoryByCategory, useLowStock, useStockValue, useActivity, useDeadStock, useStockCheckOverview } from "@/hooks/use-reports"
import { formatCompactVND, formatDateVN } from "@/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { DataTable } from "@/components/ui/data-table"
import { FileDown } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { downloadCsv } from "@/utils/download-csv"
import { ROLES } from "@/utils/permissions"
import { Skeleton } from "@/components/ui/skeleton"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  ReferenceLine,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import type { ActivityItem, StockValueItem, DeadStockItem, CategoryStock, LowStockItem, StockCheckDiscrepancy } from "@/utils/types"

const SummaryTab = lazy(() =>
  import("@/features/dashboard/components/summary-tab").then((m) => ({ default: m.SummaryTab })),
)

const ALL_TABS = [
  { key: "summary", labelKey: "dashboard.tab.overview", roles: ROLES.CAN_OPERATE },
  { key: "category", labelKey: "dashboard.tab.byCategory", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "low-stock", labelKey: "dashboard.tab.lowStock", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "stock-value", labelKey: "dashboard.tab.stockValue", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "activity", labelKey: "dashboard.tab.activity", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "dead-stock", labelKey: "dashboard.tab.deadStock", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "stock-check", labelKey: "dashboard.tab.stockCheck", roles: ROLES.CAN_VIEW_REPORTS },
] as const

type TabKey = (typeof ALL_TABS)[number]["key"]

function useVisibleTabs() {
  return ALL_TABS
}

function aggregateActivitySeries(data: ActivityItem[] | undefined, byValue = true) {
  if (!data) return []
  const map = new Map<string, { countImp: number; countExp: number; valImp: number; valExp: number }>()
  for (const a of data) {
    const day = a.date.slice(0, 10)
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

function computeDeadStockHistogram(data: DeadStockItem[] | undefined, threshold: number) {
  if (!data || data.length === 0) return []
  const p2 = Math.round(threshold * 1.33)
  const p3 = Math.round(threshold * 2)
  const buckets: Record<string, number> = { [`${threshold}-${p2}`]: 0, [`${p2}-${p3}`]: 0, [`${p3}+`]: 0 }
  for (const i of data) {
    if (i.daysInStock >= p3) buckets[`${p3}+`]++
    else if (i.daysInStock >= p2) buckets[`${p2}-${p3}`]++
    else if (i.daysInStock >= threshold) buckets[`${threshold}-${p2}`]++
  }
  return Object.entries(buckets).map(([range, count]) => ({ range, count }))
}

type DeadSortKey = "daysInStock" | "costPrice"
type DeadSortDir = "asc" | "desc"

export const DashboardPage = () => {
  const { t } = useTranslation()
  const visibleTabs = useVisibleTabs()
  const [tab, setTab] = useState<TabKey>("summary")
  const safeTab = visibleTabs.some((t) => t.key === tab) ? tab : (visibleTabs[0]?.key ?? "summary")

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {visibleTabs.map((tabDef) => (
          <Button
            key={tabDef.key}
            variant="ghost"
            onClick={() => setTab(tabDef.key)}
            className={
              "rounded-t-md px-3 py-1.5 h-auto text-sm font-medium hover:bg-transparent " +
              (safeTab === tabDef.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t(tabDef.labelKey)}
          </Button>
        ))}
      </div>
      {safeTab === "summary" && (
        <Suspense fallback={<PageSkeleton />}>
          <SummaryTab onNavigate={(t) => setTab(t as TabKey)} />
        </Suspense>
      )}
      {safeTab === "category" && <CategoryTab />}
      {safeTab === "low-stock" && <LowStockTab />}
      {safeTab === "stock-value" && <StockValueTab />}
      {safeTab === "activity" && <ActivityTab />}
      {safeTab === "dead-stock" && <DeadStockTab />}
      {safeTab === "stock-check" && <StockCheckTab />}
    </div>
  )
}

function CategoryTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useInventoryByCategory()
  const [catPage, setCatPage] = useState(0)
  const catPageSize = 20
  const barData = useMemo(() => {
    if (!data) return []
    return data
      .filter((c) => c.categoryName !== null)
      .map((c) => ({ name: c.categoryName!, products: c.productCount }))
      .sort((a, b) => b.products - a.products)
  }, [data])
  const totalCatElements = data?.length ?? 0
  const totalCatPages = Math.max(1, Math.ceil(totalCatElements / catPageSize))
  const catData = useMemo(() => {
    if (!data) return []
    return data.slice(catPage * catPageSize, (catPage + 1) * catPageSize)
  }, [data, catPage])
  const config: ChartConfig = { products: { label: t('dashboard.category.productCount'), color: "hsl(var(--chart-1))" } }
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      {barData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.category.skuByCategory')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={config} className="aspect-auto h-56">
              <BarChart data={barData} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} width={90} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="products" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
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
              "ton-kho-theo-danh-muc.csv",
              [t('dashboard.category.category'), t('dashboard.category.productCount'), t('dashboard.category.totalStock'), t('dashboard.category.value')],
              data.map((c) => [
                c.categoryName ?? t('dashboard.category.uncategorized'),
                String(c.productCount),
                String(c.totalUnits),
                String(c.totalStockValue),
              ]),
            )
          }}
          disabled={!data}
        >
          <FileDown className="size-3" /> CSV
        </Button>
      </div>
      <DataTable<CategoryStock>
        columns={[
          { header: t('dashboard.category.category'), render: (c) => <span>{c.categoryName ?? t('dashboard.category.uncategorized')}</span> },
          { header: t('dashboard.category.productCount'), className: "text-right", render: (c) => <span className="tabular-nums">{c.productCount}</span> },
          { header: t('dashboard.category.totalStock'), className: "text-right", render: (c) => <span className="tabular-nums">{c.totalUnits}</span> },
          { header: t('dashboard.category.value'), className: "text-right", render: (c) => <span className="tabular-nums">{c.totalStockValue?.toLocaleString("vi-VN") ?? "0"}₫</span> },
        ]}
        data={catData}
        isLoading={false}
        totalElements={totalCatElements}
        page={catPage}
        totalPages={totalCatPages}
        onPageChange={setCatPage}
      />
    </div>
  )
}

function LowStockTab() {
  const { t } = useTranslation()
  const [lowPage, setLowPage] = useState(0)
  const lowPageSize = 20
  const { data, isLoading } = useLowStock(lowPage, lowPageSize)
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            if (!data) return
            downloadCsv(
              "sap-het-hang.csv",
              [t('table.sku'), t('table.product'), t('dashboard.lowStock.stock'), t('dashboard.lowStock.minStock')],
              data.content.map((i) => [
                i.productSku ?? "",
                i.productName,
                String(i.quantity),
                String(i.minStock ?? ""),
              ]),
            )
          }}
          disabled={!data}
        >
          <FileDown className="size-3" /> CSV
        </Button>
      </div>
      <DataTable<LowStockItem>
        columns={[
          { header: t('table.sku'), render: (i) => <span className="font-mono text-xs">{i.productSku}</span> },
          { header: t('table.product'), render: (i) => <span className="text-sm">{i.productName}</span> },
          { header: t('dashboard.lowStock.stock'), className: "text-right", render: (i) => {
            const deficit = i.quantity - (i.minStock ?? 0)
            return <span className={`tabular-nums ${deficit <= 0 ? "text-destructive font-semibold" : ""}`}>{i.quantity}</span>
          }},
          { header: t('dashboard.lowStock.minStock'), className: "text-right", render: (i) => <span className="tabular-nums">{i.minStock}</span> },
          { header: t('dashboard.lowStock.deficit'), className: "text-right", render: (i) => {
            const deficit = i.quantity - (i.minStock ?? 0)
            return <span className={`tabular-nums ${deficit < 0 ? "text-destructive" : "text-muted-foreground"}`}>{deficit > 0 ? "+" : ""}{deficit}</span>
          }},
          { header: "", render: (i) => (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2" asChild>
              <a href={`/stock/imports/create?ref=low-stock&productId=${i.productId}`}>{t('dashboard.lowStock.import')}</a>
            </Button>
          )},
        ]}
        data={data?.content ?? []}
        isLoading={false}
        emptyMessage={t('dashboard.lowStock.empty')}
        totalElements={data?.pagination?.totalElements}
        page={data?.pagination?.number ?? 0}
        totalPages={data?.pagination?.totalPages ?? 1}
        onPageChange={setLowPage}
      />
    </div>
  )
}

function StockValueTab() {
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

function ActivityTab() {
  const { t } = useTranslation()
  const activityChartConfig: ChartConfig = {
    imports: { label: t("dashboard.activity.import"), color: "hsl(var(--chart-1))" },
    exports: { label: t("dashboard.activity.export"), color: "hsl(var(--chart-6))" },
  }
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))
  const [byValue, setByValue] = useState(true)
  const [actPage, setActPage] = useState(0)
  const actPageSize = 20
  const { data, isLoading } = useActivity(from + "T00:00:00Z", to + "T23:59:59Z")
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
          <DatePicker value={from} onChange={setFrom} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('dashboard.activity.to')}</Label>
          <DatePicker value={to} onChange={setTo} className="w-40" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setByValue((v) => !v)}>
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

function DeadStockTab() {
  const { t } = useTranslation()
  const histogramConfig: ChartConfig = {
    count: { label: t("dashboard.deadStock.productCount"), color: "hsl(var(--chart-3))" },
  }
  const [days, setDays] = useState("90")
  const [keyword, setKeyword] = useState("")
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [sortKey, setSortKey] = useState<DeadSortKey>("costPrice")
  const [sortDir, setSortDir] = useState<DeadSortDir>("desc")
  const [dsPage, setDsPage] = useState(0)
  const dsPageSize = 20
  const { data: allCategories } = useInventoryByCategory()
  const { data, isLoading } = useDeadStock(Number(days), keyword || undefined, categoryId)
  const catOptions = useMemo(
    () => (allCategories ?? []).filter((c) => c.categoryName !== null),
    [allCategories],
  )
  const histogram = useMemo(() => computeDeadStockHistogram(data, Number(days)), [data, days])
  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => {
      const cmp = sortKey === "costPrice"
        ? a.costPrice - b.costPrice
        : a.daysInStock - b.daysInStock
      return sortDir === "desc" ? -cmp : cmp
    })
  }, [data, sortKey, sortDir])
  useEffect(() => { setDsPage(0) }, [days, keyword, categoryId, sortKey, sortDir])
  const totalDsElements = sorted.length
  const totalDsPages = Math.max(1, Math.ceil(totalDsElements / dsPageSize))
  const dsData = useMemo(() => {
    return sorted.slice(dsPage * dsPageSize, (dsPage + 1) * dsPageSize)
  }, [sorted, dsPage])
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1 w-28">
          <Label htmlFor="d-days">{t('dashboard.deadStock.overDays')}</Label>
          <Input id="d-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <div className="space-y-1 w-48">
          <Label htmlFor="d-keyword">{t('dashboard.deadStock.search')}</Label>
          <Input id="d-keyword" placeholder={t('dashboard.deadStock.searchPlaceholder')} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="space-y-1 w-44">
          <Label htmlFor="d-cat">{t('dashboard.deadStock.category')}</Label>
          <select
            id="d-cat"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">{t('dashboard.deadStock.allCategories')}</option>
            {catOptions.map((c) => (
              <option key={c.categoryId} value={c.categoryId ?? ""}>
                {c.categoryName}
              </option>
            ))}
          </select>
        </div>
      </div>
      {histogram.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.deadStock.distribution')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={histogramConfig} className="aspect-auto h-40">
              <BarChart data={histogram} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="range" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
      <DataTable<DeadStockItem>
        columns={[
          { header: t('table.sku'), render: (i) => <span className="font-mono text-xs">{i.productSku}</span> },
          { header: t('table.product'), render: (i) => <span className="text-sm">{i.productName}</span> },
          { header: t('dashboard.deadStock.serial'), render: (i) => <span className="font-mono text-xs">{i.serialNumber ?? "—"}</span> },
          { header: t('dashboard.deadStock.importDate'), render: (i) => <span className="text-sm">{formatDateVN(i.importedAt)}</span> },
          { header: t('dashboard.deadStock.days'), sortKey: "daysInStock", className: "text-right", render: (i) => <span className="tabular-nums">{i.daysInStock}</span> },
          { header: t('dashboard.deadStock.costPrice'), sortKey: "costPrice", className: "text-right", render: (i) => <span className="tabular-nums">{i.costPrice?.toLocaleString("vi-VN") ?? "0"}₫</span> },
          { header: "", render: (i) => (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2" asChild>
              <a href={`/products?highlight=${i.productId}`}>{t('dashboard.deadStock.handle')}</a>
            </Button>
          )},
        ]}
        data={dsData}
        isLoading={isLoading}
        emptyMessage={t('dashboard.deadStock.empty')}
        totalElements={totalDsElements}
        page={dsPage}
        totalPages={totalDsPages}
        onPageChange={(p) => setDsPage(p)}
        sort={{ key: sortKey, dir: sortDir }}
        onSort={(key) => {
          if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"))
          else { setSortKey(key as DeadSortKey); setSortDir("desc") }
        }}
      />
    </div>
  )
}

function StockCheckTab() {
  const { t } = useTranslation()
  const chartConfig: ChartConfig = {
    checks: { label: t("dashboard.stockCheck.checks"), color: "hsl(var(--chart-1))" },
    lost: { label: t("dashboard.stockCheck.lost"), color: "hsl(var(--chart-6))" },
    found: { label: t("dashboard.stockCheck.found"), color: "hsl(var(--chart-3))" },
    damaged: { label: t("dashboard.stockCheck.damaged"), color: "hsl(var(--chart-5))" },
  }
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))
  const { data, isLoading } = useStockCheckOverview(from + "T00:00:00Z", to + "T23:59:59Z")
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
          <DatePicker value={from} onChange={setFrom} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('dashboard.activity.to')}</Label>
          <DatePicker value={to} onChange={setTo} className="w-40" />
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
