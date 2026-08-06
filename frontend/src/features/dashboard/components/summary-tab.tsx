import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useInventorySummary, useInventoryByCategory, useStockValue } from "@/hooks/use-reports"
import { formatCompactVND } from "@/utils/format"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Package, Warehouse, DollarSign, AlertTriangle, XCircle } from "lucide-react"
import {
  Treemap,
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

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-4))",
]

const HEALTHY_COLOR = "hsl(var(--chart-2))"
const LOW_STOCK_COLOR = "hsl(var(--chart-3))"
const OUT_OF_STOCK_COLOR = "hsl(var(--chart-5))"

const useHealthChartConfig = (t: (k: string) => string): ChartConfig => ({
  healthy: { label: t("summaryTab.healthy"), color: HEALTHY_COLOR },
  lowStock: { label: t("summaryTab.lowStock"), color: LOW_STOCK_COLOR },
  outOfStock: { label: t("summaryTab.outOfStock"), color: OUT_OF_STOCK_COLOR },
})

type CardVariant = "default" | "warning" | "danger"
const variantBorder: Record<CardVariant, string> = {
  default: "",
  warning: "border-l-4 border-l-chart-3",
  danger: "border-l-4 border-l-chart-5",
}

const StatCard = ({
  label,
  value,
  icon,
  subtext,
  proportion,
  highlight,
  variant = "default",
  isLoading,
  action,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  subtext?: string
  proportion?: string
  highlight?: boolean
  variant?: CardVariant
  isLoading?: boolean
  action?: React.ReactNode
}) => (
  <Card className={`p-4 ${variantBorder[variant]}`}>
    <CardContent className="p-0">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ) : (
        <div className="flex items-start gap-3">
          {icon && <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-2">
              <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${highlight ? "text-destructive" : ""}`}>
                {value}
              </p>
              {proportion && (
                <span className="text-xs text-muted-foreground tabular-nums">{proportion}</span>
              )}
            </div>
            {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
            {action && <div className="mt-1">{action}</div>}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)

interface TreemapContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  value?: number
  colors?: string[]
  index?: number
  depth?: number
  [key: string]: unknown
}

const CustomTreemapContent = (props: TreemapContentProps) => {
  const { x, y, width, height, name, value, colors, index } = props
  if (width < 20 || height < 20) return null
  const fontSize = width < 80 ? 9 : width < 140 ? 10 : 11
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={colors[index % colors.length]} stroke="var(--background)" strokeWidth={1} />
      {width > 40 && height > 30 && (
        <>
          <text x={x + 4} y={y + 14} className="fill-white dark:fill-[oklch(0.15_0.01_210)]" fontSize={fontSize} fontWeight={600}>
            {name}
          </text>
          <text x={x + 4} y={y + 28} className="fill-white/80 dark:fill-[oklch(0.15_0.01_210)]" fontSize={fontSize - 1}>
            {formatCompactVND(value)}
          </text>
        </>
      )}
    </g>
  )
}

interface SummaryTabProps {
  onNavigate?: (tab: string) => void
}

export function SummaryTab({ onNavigate }: SummaryTabProps) {
  const { t } = useTranslation()
  const healthChartConfig = useHealthChartConfig(t)
  const { data: summary, isLoading } = useInventorySummary()
  const { data: categories } = useInventoryByCategory()
  const { data: stockValue } = useStockValue()

  const handleTreemapClick = useCallback(
    (node: TreemapContentProps) => {
      if (node?.depth >= 0) onNavigate?.("category")
    },
    [onNavigate],
  )

  const categoryCount = useMemo(() => categories?.filter((c) => c.categoryName !== null).length ?? 0, [categories])

  const { categorized, uncategorizedCount } = useMemo(() => {
    if (!categories) return { categorized: [], uncategorizedCount: 0 }
    const uncat = categories.filter((c) => c.categoryName === null)
    return {
      categorized: categories.filter((c) => c.categoryName !== null),
      uncategorizedCount: uncat.length > 0 ? uncat[0].productCount : 0,
    }
  }, [categories])

  const lowStockPct = summary && summary.totalProducts > 0
    ? ((summary.lowStockCount / summary.totalProducts) * 100).toFixed(1) + "%"
    : undefined

  const outOfStockPct = summary && summary.totalProducts > 0
    ? ((summary.outOfStockCount / summary.totalProducts) * 100).toFixed(1) + "%"
    : undefined

  const avgPerCategory = categoryCount > 0 && summary
    ? (summary.totalUnits / categoryCount).toFixed(0)
    : undefined

  const treemapData = useMemo(
    () =>
      categorized.map((c) => ({
        name: c.categoryName!,
        value: c.totalStockValue,
      })),
    [categorized],
  )

  const healthData = useMemo(
    () =>
      categorized.map((c) => ({
        name: c.categoryName!,
        healthy: c.healthyCount,
        lowStock: c.lowStockCount,
        outOfStock: c.outOfStockCount,
      })),
    [categorized],
  )

  const top10 = useMemo(() => {
    if (!stockValue) return []
    const sorted = [...stockValue].sort((a, b) => b.totalValue - a.totalValue).slice(0, 10)
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
  }, [stockValue])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={t('summaryTab.products')}
          value={String(summary?.totalProducts ?? "—")}
          icon={<Package className="size-4" />}
          subtext={categoryCount > 0 ? t('summaryTab.inCategories', { count: categoryCount }) : undefined}
          isLoading={isLoading}
        />
        <StatCard
          label={t('summaryTab.totalStock')}
          value={String(summary?.totalUnits ?? "—")}
          icon={<Warehouse className="size-4" />}
          subtext={avgPerCategory ? t('summaryTab.avgPerCategory', { count: avgPerCategory }) : undefined}
          isLoading={isLoading}
        />
        <StatCard
          label={t('summaryTab.stockValue')}
          value={
            summary?.totalStockValue != null
              ? formatCompactVND(Number(summary.totalStockValue)) + "₫"
              : "—"
          }
          icon={<DollarSign className="size-4" />}
          isLoading={isLoading}
          action={
            summary?.trendPercent != null && summary.trendPercent !== 0 ? (
              <span
                className={`inline-flex items-center gap-0.5 text-xs tabular-nums ${
                  summary.trendPercent > 0 ? "text-chart-2" : "text-destructive"
                }`}
              >
                {summary.trendPercent > 0 ? "↑" : "↓"}{" "}
                {Math.abs(summary.trendPercent).toFixed(1)}%
                <span className="text-muted-foreground font-normal">{t('summaryTab.vsLastMonth')}</span>
              </span>
            ) : undefined
          }
        />
        <StatCard
          label={t('summaryTab.lowStock')}
          value={String(summary?.lowStockCount ?? "—")}
          icon={<AlertTriangle className="size-4" />}
          proportion={lowStockPct}
          variant={summary?.lowStockCount ? "warning" : "default"}
          isLoading={isLoading}
          action={
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onNavigate?.("low-stock")}
            >
              {t('summaryTab.viewDetails')} →
            </Button>
          }
        />
        <StatCard
          label={t('summaryTab.outOfStock')}
          value={String(summary?.outOfStockCount ?? "—")}
          icon={<XCircle className="size-4" />}
          proportion={outOfStockPct}
          variant={summary?.outOfStockCount ? "danger" : "default"}
          isLoading={isLoading}
        />
      </div>

      {uncategorizedCount > 0 && (
        <Alert variant="warning">
          <AlertDescription>
            {t('summaryTab.uncategorizedWarning', { count: uncategorizedCount })}{" "}
            <a href="/products?filter=uncategorized" className="underline font-medium">
              {t('summaryTab.viewAndCategorize')}
            </a>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('summaryTab.stockValueByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!categories ? (
                <Skeleton className="h-72 w-full" />
              ) : treemapData.length === 0 ? (
                <EmptyTitle>{t('summaryTab.noData')}</EmptyTitle>
              ) : (
                <ChartContainer config={{}} className="aspect-auto h-72">
                  <Treemap
                    data={treemapData}
                    dataKey="value"
                    nameKey="name"
                    stroke="#fff"
                    onClick={handleTreemapClick}
                    content={<CustomTreemapContent colors={CHART_COLORS} index={0} />}
                  />
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('summaryTab.healthByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!categories ? (
                <Skeleton className="h-72 w-full" />
              ) : healthData.length === 0 ? (
                <EmptyTitle>{t('summaryTab.noData')}</EmptyTitle>
              ) : (
                <ChartContainer config={healthChartConfig} className="aspect-auto h-72">
                  <BarChart data={healthData} layout="vertical" barCategoryGap={4} margin={{ left: 0 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={10}
                      width={80}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="healthy" stackId="a" fill={HEALTHY_COLOR} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="lowStock" stackId="a" fill={LOW_STOCK_COLOR} />
                    <Bar dataKey="outOfStock" stackId="a" fill={OUT_OF_STOCK_COLOR} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('summaryTab.top10ByValue')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!stockValue ? (
                <Skeleton className="h-80 w-full" />
              ) : top10.length === 0 ? (
                <EmptyTitle>{t('summaryTab.noData')}</EmptyTitle>
              ) : (
                <ChartContainer
                  config={{
                    value: { label: t('summaryTab.value') },
                    cumulative: { label: t('summaryTab.cumulativePercent') },
                  }}
                  className="aspect-auto h-80"
                >
                  <ComposedChart data={top10} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
                            <p>
                              {t('summaryTab.stockQty')}: <span className="tabular-nums">{d?.quantity}</span>
                            </p>
                            <p>
                              {t('summaryTab.unitPrice')}:{" "}
                              <span className="tabular-nums">
                                {d?.unitPrice?.toLocaleString("vi-VN") ?? "—"}₫
                              </span>
                            </p>
                            <p>
                              {t('summaryTab.totalValue')}:{" "}
                              <span className="tabular-nums">
                                {formatCompactVND(d?.value ?? 0)}₫
                              </span>
                            </p>
                            <p>
                              {t('summaryTab.cumulative')}:{" "}
                              <span className="tabular-nums">
                                {Number(d?.cumulativePercent ?? 0).toFixed(1)}%
                              </span>
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar yAxisId="left" dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativePercent"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <ReferenceLine
                      yAxisId="right"
                      y={80}
                      stroke="hsl(var(--chart-5))"
                      strokeDasharray="4 4"
                      label={{
                        value: "80%",
                        position: "right",
                        fontSize: 11,
                        fill: "hsl(var(--chart-5))",
                      }}
                    />
                  </ComposedChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
