import { useState } from "react"
import { useAuthStore } from "@/store/auth-store"

import { useInventorySummary, useInventoryByCategory, useLowStock, useStockValue, useActivity, useDeadStock } from "@/hooks/use-reports"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import type { URole } from "@/utils/types"
import type { ChartConfig } from "@/components/ui/chart"
import { FileDown } from "lucide-react"
import { downloadCsv } from "@/utils/download-csv"

const ALL_TABS = [
  { key: "summary", label: "Tổng quan", roles: ["ADMIN", "MANAGER", "SALES"] as URole[] },
  { key: "category", label: "Theo danh mục", roles: ["ADMIN", "MANAGER"] as URole[] },
  { key: "low-stock", label: "Sắp hết hàng", roles: ["ADMIN", "MANAGER"] as URole[] },
  { key: "stock-value", label: "Giá trị tồn", roles: ["ADMIN", "MANAGER"] as URole[] },
  { key: "activity", label: "Hoạt động", roles: ["ADMIN", "MANAGER"] as URole[] },
  { key: "dead-stock", label: "Tồn lâu", roles: ["ADMIN", "MANAGER"] as URole[] },
] as const

type TabKey = (typeof ALL_TABS)[number]["key"]

function useRole() {
  return useAuthStore((s) => s.user?.role ?? "STOCK")
}

function useVisibleTabs() {
  const role = useRole()
  return ALL_TABS.filter((t) => (t.roles as URole[]).includes(role))
}

export const DashboardPage = () => {
  const visibleTabs = useVisibleTabs()
  const [tab, setTab] = useState<TabKey>("summary")
  const safeTab = visibleTabs.some((t) => t.key === tab) ? tab : visibleTabs[0]?.key ?? "summary"

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {visibleTabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md ${safeTab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {safeTab === "summary" && <SummaryTab />}
      {safeTab === "category" && <CategoryTab />}
      {safeTab === "low-stock" && <LowStockTab />}
      {safeTab === "stock-value" && <StockValueTab />}
      {safeTab === "activity" && <ActivityTab />}
      {safeTab === "dead-stock" && <DeadStockTab />}
    </div>
  )
}

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)", "var(--color-chart-6)", "var(--color-chart-7)"]

function SummaryTab() {
  const { data: summary, isLoading } = useInventorySummary()
  const { data: categories } = useInventoryByCategory()
  const { data: stockValue } = useStockValue()

  const barGroupData = categories?.map((c) => ({
    name: c.categoryName ?? "Chưa phân loại",
    products: c.productCount,
    units: c.totalUnits,
    value: c.totalStockValue,
  })) ?? []

  const topStock = stockValue?.sort((a, b) => b.totalValue - a.totalValue).slice(0, 10).map((i) => ({
    name: i.productName.length > 24 ? i.productName.slice(0, 24) + "…" : i.productName,
    value: i.totalValue,
  })) ?? []

  const barGroupConfig: ChartConfig = {
    products: { label: "Số SP", color: CHART_COLORS[0] },
    units: { label: "Tổng tồn", color: CHART_COLORS[3] },
  }
  const barValueConfig: ChartConfig = {
    value: { label: "Giá trị tồn (₫)", color: CHART_COLORS[1] },
  }
  const topStockConfig: ChartConfig = {
    value: { label: "Giá trị (₫)", color: CHART_COLORS[2] },
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Sản phẩm" value={String(summary?.totalProducts ?? "—")} isLoading={isLoading} />
        <StatCard label="Tổng tồn" value={String(summary?.totalUnits ?? "—")} isLoading={isLoading} />
        <StatCard label="Giá trị tồn" value={summary ? `${summary.totalStockValue.toLocaleString("vi-VN")}₫` : "—"} isLoading={isLoading} />
        <StatCard label="Sắp hết" value={String(summary?.lowStockCount ?? "—")} isLoading={isLoading} highlight={!!summary?.lowStockCount} />
        <StatCard label="Hết hàng" value={String(summary?.outOfStockCount ?? "—")} isLoading={isLoading} highlight={!!summary?.outOfStockCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Tồn kho theo danh mục</CardTitle></CardHeader>
          <CardContent>
            {!categories ? <Skeleton className="h-64 w-full" />
            : categories.length === 0 ? <EmptyTitle>Chưa có dữ liệu</EmptyTitle>
            : (
              <ChartContainer config={barGroupConfig} className="aspect-auto h-72">
                <BarChart data={barGroupData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="products" fill="var(--color-products)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="units" fill="var(--color-units)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Giá trị tồn theo danh mục</CardTitle></CardHeader>
          <CardContent>
            {!categories ? <Skeleton className="h-64 w-full" />
            : categories.length === 0 ? <EmptyTitle>Chưa có dữ liệu</EmptyTitle>
            : (
              <ChartContainer config={barValueConfig} className="aspect-auto h-72">
                <BarChart data={barGroupData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v: number) => (v / 1_000_000).toFixed(0) + "M"} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(v: unknown) => (v as number).toLocaleString("vi-VN") + "₫"} />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Phân bổ sản phẩm theo danh mục</CardTitle></CardHeader>
          <CardContent>
            {!categories ? <Skeleton className="h-64 w-full" />
            : categories.length === 0 ? <EmptyTitle>Chưa có dữ liệu</EmptyTitle>
            : (
              <div className="space-y-3">
                <ChartContainer config={{}} className="aspect-auto h-64">
                  <PieChart>
                    <Pie data={barGroupData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                      dataKey="products" nameKey="name" paddingAngle={2}>
                      {barGroupData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {barGroupData.map((d, i) => (
                    <span key={d.name} className="inline-flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top sản phẩm theo giá trị tồn</CardTitle></CardHeader>
          <CardContent>
            {!stockValue ? <Skeleton className="h-64 w-full" />
            : topStock.length === 0 ? <EmptyTitle>Chưa có dữ liệu</EmptyTitle>
            : (
              <ChartContainer config={topStockConfig} className="aspect-auto h-72">
                <BarChart data={topStock} layout="vertical" margin={{ left: 0, right: 0 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={11}
                    tickFormatter={(v: number) => (v / 1_000_000).toFixed(0) + "M"} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={140} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(v: unknown) => (v as number).toLocaleString("vi-VN") + "₫"} />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const StatCard = ({ label, value, highlight, isLoading }: { label: string; value: string; highlight?: boolean; isLoading?: boolean }) => (
  <Card className="p-4">
    <CardContent className="p-0">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${highlight ? "text-destructive" : ""}`}>{value}</p>
        </>
      )}
    </CardContent>
  </Card>
)

function CategoryTab() {
  const { data, isLoading } = useInventoryByCategory()
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
          if (!data) return
          downloadCsv("ton-kho-theo-danh-muc.csv",
            ["Danh mục", "Số SP", "Tổng tồn", "Giá trị"],
            data.map((c) => [c.categoryName ?? "Chưa phân loại", String(c.productCount), String(c.totalUnits), String(c.totalStockValue)]),
          )
        }} disabled={!data}><FileDown className="size-3" /> CSV</Button>
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
                <TableCell className="text-right tabular-nums">{c.totalStockValue.toLocaleString("vi-VN")}₫</TableCell>
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
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
          if (!data) return
          downloadCsv("sap-het-hang.csv",
            ["SKU", "Sản phẩm", "Tồn", "Tồn tối thiểu"],
            data.content.map((i) => [i.productSku, i.productName, String(i.quantity), String(i.minStock)]),
          )
        }} disabled={!data}><FileDown className="size-3" /> CSV</Button>
      </div>
      <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>SKU</TableHead><TableHead>Sản phẩm</TableHead>
          <TableHead className="text-right">Tồn</TableHead><TableHead className="text-right">Tồn tối thiểu</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {!data || data.content.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center py-8"><EmptyTitle>Không có sản phẩm nào sắp hết hàng</EmptyTitle></TableCell></TableRow>
          ) : data.content.map((i) => (
            <TableRow key={i.productId}>
              <TableCell className="font-mono text-xs">{i.productSku}</TableCell>
              <TableCell className="text-sm">{i.productName}</TableCell>
              <TableCell className={`text-right tabular-nums ${i.quantity <= i.minStock ? "text-destructive" : ""}`}>{i.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">{i.minStock}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

function StockValueTab() {
  const { data, isLoading } = useStockValue()
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
          if (!data) return
          downloadCsv("gia-tri-ton.csv",
            ["SKU", "Sản phẩm", "Danh mục", "SL", "Đơn giá", "Tổng giá trị"],
            data.map((i) => [i.productSku, i.productName, i.categoryName ?? "—", String(i.quantity), String(i.unitPrice), String(i.totalValue)]),
          )
        }} disabled={!data}><FileDown className="size-3" /> CSV</Button>
      </div>
      <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>SKU</TableHead><TableHead>Sản phẩm</TableHead><TableHead>Danh mục</TableHead>
          <TableHead className="text-right">SL</TableHead><TableHead className="text-right">Đơn giá</TableHead><TableHead className="text-right">Tổng giá trị</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {!data || data.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8"><EmptyTitle>Chưa có dữ liệu</EmptyTitle></TableCell></TableRow>
          ) : data.map((i) => (
            <TableRow key={i.productId}>
              <TableCell className="font-mono text-xs">{i.productSku}</TableCell>
              <TableCell className="text-sm">{i.productName}</TableCell>
              <TableCell className="text-sm">{i.categoryName ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">{i.unitPrice.toLocaleString("vi-VN")}₫</TableCell>
              <TableCell className="text-right tabular-nums">{i.totalValue.toLocaleString("vi-VN")}₫</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

function ActivityTab() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))
  const { data, isLoading } = useActivity(from, to)
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="space-y-1"><Label htmlFor="d-from">Từ</Label><Input id="d-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="d-to">Đến</Label><Input id="d-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Loại</TableHead><TableHead>Mã phiếu</TableHead><TableHead>Ngày</TableHead>
            <TableHead>Đối tác</TableHead><TableHead className="text-right">Dòng</TableHead><TableHead className="text-right">Tổng tiền</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
            : !data || data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><EmptyTitle>Không có hoạt động trong khoảng thời gian này</EmptyTitle></TableCell></TableRow>
            ) : data.map((a, i) => (
              <TableRow key={i}>
                <TableCell><Badge variant={a.type === "IMPORT" ? "default" : "secondary"}>{a.type === "IMPORT" ? "Nhập" : "Xuất"}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{a.receiptCode}</TableCell>
                <TableCell className="text-sm">{new Date(a.date).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell className="text-sm">{a.counterpartyName ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{a.lineItems}</TableCell>
                <TableCell className="text-right tabular-nums">{a.totalAmount.toLocaleString("vi-VN")}₫</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function DeadStockTab() {
  const [days, setDays] = useState("90")
  const { data, isLoading } = useDeadStock(Number(days))
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end">
        <div className="space-y-1 w-36"><Label htmlFor="d-days">Tồn trên (ngày)</Label>
          <Input id="d-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>SKU</TableHead><TableHead>Sản phẩm</TableHead><TableHead>Serial</TableHead>
            <TableHead>Ngày nhập</TableHead><TableHead className="text-right">Số ngày</TableHead><TableHead className="text-right">Giá vốn</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
            : !data || data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><EmptyTitle>Không có hàng tồn lâu</EmptyTitle></TableCell></TableRow>
            ) : data.map((i, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-xs">{i.productSku}</TableCell>
                <TableCell className="text-sm">{i.productName}</TableCell>
                <TableCell className="font-mono text-xs">{i.serialNumber ?? "—"}</TableCell>
                <TableCell className="text-sm">{new Date(i.importedAt).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell className="text-right tabular-nums">{i.daysInStock}</TableCell>
                <TableCell className="text-right tabular-nums">{i.costPrice.toLocaleString("vi-VN")}₫</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
