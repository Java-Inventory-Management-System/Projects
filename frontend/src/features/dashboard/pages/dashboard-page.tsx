import { lazy, Suspense, useMemo, useState } from "react"
import { useInventoryByCategory, useLowStock, useStockValue, useActivity, useDeadStock } from "@/hooks/use-reports"
import { formatCompactVND, formatDateVN } from "@/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileDown } from "lucide-react"
import { downloadCsv } from "@/utils/download-csv"
import { ROLES } from "@/utils/permissions"
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
import type { ActivityItem, StockValueItem, DeadStockItem } from "@/utils/types"

const SummaryTab = lazy(() =>
  import("@/features/dashboard/components/summary-tab").then((m) => ({ default: m.SummaryTab })),
)

const ALL_TABS = [
  { key: "summary", label: "Tổng quan", roles: ROLES.CAN_OPERATE },
  { key: "category", label: "Theo danh mục", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "low-stock", label: "Sắp hết hàng", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "stock-value", label: "Giá trị tồn", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "activity", label: "Hoạt động", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "dead-stock", label: "Tồn lâu", roles: ROLES.CAN_VIEW_REPORTS },
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
  const visibleTabs = useVisibleTabs()
  const [tab, setTab] = useState<TabKey>("summary")
  const safeTab = visibleTabs.some((t) => t.key === tab) ? tab : (visibleTabs[0]?.key ?? "summary")

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {visibleTabs.map((t) => (
          <Button
            key={t.key}
            variant="ghost"
            onClick={() => setTab(t.key)}
            className={
              "rounded-t-md px-3 py-1.5 h-auto text-sm font-medium hover:bg-transparent " +
              (safeTab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
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
    </div>
  )
}

function CategoryTab() {
  const { data, isLoading } = useInventoryByCategory()
  const barData = useMemo(() => {
    if (!data) return []
    return data
      .filter((c) => c.categoryName !== null)
      .map((c) => ({ name: c.categoryName!, products: c.productCount }))
      .sort((a, b) => b.products - a.products)
  }, [data])
  const config: ChartConfig = { products: { label: "Số SP", color: "hsl(var(--chart-1))" } }
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      {barData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Số SKU theo danh mục</CardTitle></CardHeader>
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
              ["Danh mục", "Số SP", "Tổng tồn", "Giá trị"],
              data.map((c) => [
                c.categoryName ?? "Chưa phân loại",
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
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Số SP</TableHead>
              <TableHead className="text-right">Tổng tồn</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((c) => (
              <TableRow key={c.categoryId ?? 0}>
                <TableCell>{c.categoryName ?? "Chưa phân loại"}</TableCell>
                <TableCell className="text-right tabular-nums">{c.productCount}</TableCell>
                <TableCell className="text-right tabular-nums">{c.totalUnits}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.totalStockValue?.toLocaleString("vi-VN") ?? "0"}₫
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function LowStockTab() {
  const { data, isLoading } = useLowStock()
  const sorted = useMemo(() => {
    if (!data) return []
    return [...data.content].sort((a, b) => {
      const deficitA = a.quantity - (a.minStock ?? 0)
      const deficitB = b.quantity - (b.minStock ?? 0)
      return deficitA - deficitB
    })
  }, [data])
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
              ["SKU", "Sản phẩm", "Tồn", "Tồn tối thiểu"],
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
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">Tồn</TableHead>
              <TableHead className="text-right">Tồn tối thiểu</TableHead>
              <TableHead className="text-right">Thiếu</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <EmptyTitle>Không có sản phẩm nào sắp hết hàng</EmptyTitle>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((i) => {
                const deficit = i.quantity - (i.minStock ?? 0)
                return (
                  <TableRow key={i.productId}>
                    <TableCell className="font-mono text-xs">{i.productSku}</TableCell>
                    <TableCell className="text-sm">{i.productName}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${deficit <= 0 ? "text-destructive font-semibold" : ""}`}
                    >
                      {i.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{i.minStock}</TableCell>
                    <TableCell className={`text-right tabular-nums ${deficit < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {deficit > 0 ? "+" : ""}{deficit}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" asChild>
                        <a href={`/stock/imports/create?ref=low-stock&productId=${i.productId}`}>Nhập</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const paretoConfig: ChartConfig = {
  value: { label: "Giá trị" },
  cumulative: { label: "Tích luỹ %" },
}

function StockValueTab() {
  const { data, isLoading } = useStockValue()
  const paretoData = useMemo(() => computePareto(data), [data])
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      {paretoData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Phân tích ABC — Giá trị tồn</CardTitle></CardHeader>
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
                        <p>SL tồn: <span className="tabular-nums">{d?.quantity}</span></p>
                        <p>Đơn giá: <span className="tabular-nums">{d?.unitPrice?.toLocaleString("vi-VN") ?? "—"}₫</span></p>
                        <p>Tổng giá trị: <span className="tabular-nums">{formatCompactVND(d?.value ?? 0)}₫</span></p>
                        <p>Tích luỹ: <span className="tabular-nums">{Number(d?.cumulativePercent ?? 0).toFixed(1)}%</span></p>
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
              ["SKU", "Sản phẩm", "Danh mục", "SL", "Đơn giá", "Tổng giá trị"],
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
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">SL</TableHead>
              <TableHead className="text-right">Đơn giá</TableHead>
              <TableHead className="text-right">Tổng giá trị</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <EmptyTitle>Chưa có dữ liệu</EmptyTitle>
                </TableCell>
              </TableRow>
            ) : (
              data.map((i) => (
                <TableRow key={i.productId}>
                  <TableCell className="font-mono text-xs">{i.productSku}</TableCell>
                  <TableCell className="text-sm">{i.productName}</TableCell>
                  <TableCell className="text-sm">{i.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.unitPrice?.toLocaleString("vi-VN") ?? "0"}₫
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.totalValue?.toLocaleString("vi-VN") ?? "0"}₫
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const activityChartConfig: ChartConfig = {
  imports: { label: "Nhập", color: "hsl(var(--chart-1))" },
  exports: { label: "Xuất", color: "hsl(var(--chart-6))" },
}

function ActivityTab() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))
  const [byValue, setByValue] = useState(true)
  const { data, isLoading } = useActivity(from + "T00:00:00Z", to + "T23:59:59Z")
  const series = useMemo(() => aggregateActivitySeries(data, byValue), [data, byValue])
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="d-from">Từ</Label>
          <Input id="d-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-to">Đến</Label>
          <Input id="d-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setByValue((v) => !v)}>
          {byValue ? "Theo số lượng" : "Theo giá trị"}
        </Button>
      </div>
      {series.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nhập / Xuất {byValue ? "theo giá trị" : "theo số lượng"}</CardTitle></CardHeader>
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
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loại</TableHead>
              <TableHead>Mã phiếu</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Đối tác</TableHead>
              <TableHead className="text-right">Dòng</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <EmptyTitle>Không có hoạt động trong khoảng thời gian này</EmptyTitle>
                </TableCell>
              </TableRow>
            ) : (
              data.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant={a.type === "IMPORT" ? "default" : "secondary"}>
                      {a.type === "IMPORT" ? "Nhập" : "Xuất"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.receiptCode}</TableCell>
                  <TableCell className="text-sm">{formatDateVN(a.date)}</TableCell>
                  <TableCell className="text-sm">{a.counterpartyName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.lineItems}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.totalAmount?.toLocaleString("vi-VN") ?? "0"}₫
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const histogramConfig: ChartConfig = {
  count: { label: "Số SP", color: "hsl(var(--chart-3))" },
}

function DeadStockTab() {
  const [days, setDays] = useState("90")
  const [keyword, setKeyword] = useState("")
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [sortKey, setSortKey] = useState<DeadSortKey>("costPrice")
  const [sortDir, setSortDir] = useState<DeadSortDir>("desc")
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
  const toggleSort = (key: DeadSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    else { setSortKey(key); setSortDir("desc") }
  }
  const sortArrow = (key: DeadSortKey) => sortKey === key ? (sortDir === "desc" ? " ↓" : " ↑") : ""
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1 w-28">
          <Label htmlFor="d-days">Tồn trên (ngày)</Label>
          <Input id="d-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <div className="space-y-1 w-48">
          <Label htmlFor="d-keyword">Tìm kiếm</Label>
          <Input id="d-keyword" placeholder="SKU, tên SP..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="space-y-1 w-44">
          <Label htmlFor="d-cat">Danh mục</Label>
          <select
            id="d-cat"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Tất cả</option>
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
          <CardHeader><CardTitle className="text-base">Phân bố theo thời gian tồn</CardTitle></CardHeader>
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
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Ngày nhập</TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("daysInStock")}>
                Số ngày{sortArrow("daysInStock")}
              </TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("costPrice")}>
                Giá vốn{sortArrow("costPrice")}
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <EmptyTitle>Không có hàng tồn lâu</EmptyTitle>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((i, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs">{i.productSku}</TableCell>
                  <TableCell className="text-sm">{i.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{i.serialNumber ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDateVN(i.importedAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.daysInStock}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.costPrice?.toLocaleString("vi-VN") ?? "0"}₫
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" asChild>
                      <a href={`/products?highlight=${i.productId}`}>Xử lý</a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
