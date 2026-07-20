import { useState, useEffect } from "react"
import { getInventorySummary, getInventoryByCategory, getLowStock, getStockValue, getActivity, getDeadStock } from "@/features/stock/services/report-service"
import type { InventorySummary, CategoryStock, LowStockItem, StockValueItem, ActivityItem, DeadStockItem, ResponsePage } from "@/utils/types"
import { Badge } from "@/components/ui/badge"
import { EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type Tab = "summary" | "category" | "low-stock" | "stock-value" | "activity" | "dead-stock"
const tabs: { key: Tab; label: string }[] = [
  { key: "summary", label: "Tổng quan" },
  { key: "category", label: "Theo danh mục" },
  { key: "low-stock", label: "Sắp hết hàng" },
  { key: "stock-value", label: "Giá trị tồn" },
  { key: "activity", label: "Hoạt động" },
  { key: "dead-stock", label: "Tồn lâu" },
]

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("summary")

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Báo cáo</h1>
      <div className="flex gap-1 border-b pb-px">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md ${tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "summary" && <SummaryTab />}
      {tab === "category" && <CategoryTab />}
      {tab === "low-stock" && <LowStockTab />}
      {tab === "stock-value" && <StockValueTab />}
      {tab === "activity" && <ActivityTab />}
      {tab === "dead-stock" && <DeadStockTab />}
    </div>
  )
}

function SummaryTab() {
  const [data, setData] = useState<InventorySummary | null>(null)
  useEffect(() => { getInventorySummary().then(setData) }, [])
  if (!data) return <Skeleton className="h-32 w-full" />
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {[
        { label: "Sản phẩm", value: data.totalProducts, color: "" },
        { label: "Tổng tồn", value: data.totalUnits, color: "" },
        { label: "Giá trị tồn", value: data.totalStockValue.toLocaleString("vi-VN") + "₫", color: "" },
        { label: "Sắp hết", value: data.lowStockCount, color: data.lowStockCount > 0 ? "text-amber-600" : "" },
        { label: "Hết hàng", value: data.outOfStockCount, color: data.outOfStockCount > 0 ? "text-destructive" : "" },
      ].map((c) => (
        <div key={c.label} className="rounded-lg border px-4 py-3">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className={`text-2xl font-semibold tabular-nums ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}

function CategoryTab() {
  const [data, setData] = useState<CategoryStock[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getInventoryByCategory().then(setData).finally(() => setLoading(false)) }, [])
  if (loading) return <Skeleton className="h-48 w-full" />
  return (
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
          {data.map((c) => (
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
  )
}

function LowStockTab() {
  const [data, setData] = useState<ResponsePage<LowStockItem> | null>(null)
  useEffect(() => { getLowStock().then(setData) }, [])
  if (!data) return <Skeleton className="h-48 w-full" />
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>SKU</TableHead><TableHead>Sản phẩm</TableHead>
          <TableHead className="text-right">Tồn</TableHead><TableHead className="text-right">Tồn tối thiểu</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {data.content.length === 0 ? (
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
  )
}

function StockValueTab() {
  const [data, setData] = useState<StockValueItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getStockValue().then(setData).finally(() => setLoading(false)) }, [])
  if (loading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>SKU</TableHead><TableHead>Sản phẩm</TableHead><TableHead>Danh mục</TableHead>
          <TableHead className="text-right">SL</TableHead><TableHead className="text-right">Đơn giá</TableHead><TableHead className="text-right">Tổng giá trị</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {data.length === 0 ? (
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
  )
}

function ActivityTab() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))
  const [data, setData] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    getActivity(new Date(from).toISOString(), new Date(to).toISOString()).then(setData).finally(() => setLoading(false))
  }, [from, to])
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="space-y-1"><Label htmlFor="from">Từ</Label><Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="to">Đến</Label><Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Loại</TableHead><TableHead>Mã phiếu</TableHead><TableHead>Ngày</TableHead>
            <TableHead>Đối tác</TableHead><TableHead className="text-right">Dòng</TableHead><TableHead className="text-right">Tổng tiền</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
            : data.length === 0 ? (
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
  const [data, setData] = useState<DeadStockItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    getDeadStock(Number(days)).then(setData).finally(() => setLoading(false))
  }, [days])
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end">
        <div className="space-y-1 w-36"><Label htmlFor="days">Tồn trên (ngày)</Label>
          <Input id="days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>SKU</TableHead><TableHead>Sản phẩm</TableHead><TableHead>Serial</TableHead>
            <TableHead>Ngày nhập</TableHead><TableHead className="text-right">Số ngày</TableHead><TableHead className="text-right">Giá vốn</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
            : data.length === 0 ? (
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
