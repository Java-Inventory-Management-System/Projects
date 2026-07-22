import { useInventorySummary, useInventoryByCategory, useStockValue } from "@/hooks/use-reports"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)", "var(--color-chart-6)", "var(--color-chart-7)"]

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

export function SummaryTab() {
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
              <ChartContainer config={barValueConfig} className="aspect-auto h-72">
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
