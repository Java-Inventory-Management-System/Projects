import { lazy, Suspense, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useInventoryByCategory, useLowStock, useStockValue, useActivity, useDeadStock } from "@/hooks/use-reports"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { cn } from "@/utils/cn"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { URole } from "@/utils/types"
import { FileDown } from "lucide-react"
import { downloadCsv } from "@/utils/download-csv"
import { ROLES } from "@/utils/permissions"
import { PageSkeleton } from "@/components/ui/page-skeleton"

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
            className={cn(
              "rounded-t-md px-3 py-1.5 h-auto text-sm font-medium hover:bg-transparent",
              safeTab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {safeTab === "summary" && (
        <Suspense fallback={<PageSkeleton />}>
          <SummaryTab />
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
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
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
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data || data.content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <EmptyTitle>Không có sản phẩm nào sắp hết hàng</EmptyTitle>
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((i) => (
                <TableRow key={i.productId}>
                  <TableCell className="font-mono text-xs">{i.productSku}</TableCell>
                  <TableCell className="text-sm">{i.productName}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${i.quantity <= (i.minStock ?? 0) ? "text-destructive" : ""}`}
                  >
                    {i.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{i.minStock}</TableCell>
                </TableRow>
              ))
            )}
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

function ActivityTab() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))
  const { data, isLoading } = useActivity(from + "T00:00:00Z", to + "T23:59:59Z")
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="space-y-1">
          <Label htmlFor="d-from">Từ</Label>
          <Input id="d-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-to">Đến</Label>
          <Input id="d-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
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
                  <TableCell className="text-sm">{new Date(a.date).toLocaleDateString("vi-VN")}</TableCell>
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

function DeadStockTab() {
  const [days, setDays] = useState("90")
  const { data, isLoading } = useDeadStock(Number(days))
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end">
        <div className="space-y-1 w-36">
          <Label htmlFor="d-days">Tồn trên (ngày)</Label>
          <Input id="d-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Ngày nhập</TableHead>
              <TableHead className="text-right">Số ngày</TableHead>
              <TableHead className="text-right">Giá vốn</TableHead>
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
                  <EmptyTitle>Không có hàng tồn lâu</EmptyTitle>
                </TableCell>
              </TableRow>
            ) : (
              data.map((i, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs">{i.productSku}</TableCell>
                  <TableCell className="text-sm">{i.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{i.serialNumber ?? "—"}</TableCell>
                  <TableCell className="text-sm">{new Date(i.importedAt).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.daysInStock}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.costPrice?.toLocaleString("vi-VN") ?? "0"}₫
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
