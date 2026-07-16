import { useState, useCallback, useEffect } from "react"
import { getProductUnits } from "@/features/stock/services/product-unit-service"
import { getProducts } from "@/services/product-service"
import type { ProductUnit, ResponsePage, ProductResponse, ProductUnitStatus } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Eye, RefreshCw } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ViewProductUnitModal } from "../components/view-product-unit-modal"
import { useAuthStore } from "@/store/auth-store"

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "IN_STOCK", label: "Trong kho" },
  { value: "SOLD", label: "Đã bán" },
  { value: "DEFECTIVE", label: "Lỗi" },
  { value: "DAMAGED_IN_STORAGE", label: "Hư trong kho" },
  { value: "LOST", label: "Mất" },
  { value: "UNDER_REPAIR", label: "Đang sửa" },
  { value: "SENT_TO_MANUFACTURER", label: "Gửi NSX" },
  { value: "RETURNED", label: "Trả lại" },
  { value: "RETURNED_TO_SUPPLIER", label: "Trả NCC" },
  { value: "REMOVED", label: "Đã xóa" },
  { value: "DISPOSED", label: "Hủy" },
]

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  IN_STOCK: { label: "Trong kho", variant: "default" },
  SOLD: { label: "Đã bán", variant: "secondary" },
  DEFECTIVE: { label: "Lỗi", variant: "destructive" },
  DAMAGED_IN_STORAGE: { label: "Hư trong kho", variant: "destructive" },
  LOST: { label: "Mất", variant: "destructive" },
  UNDER_REPAIR: { label: "Đang sửa", variant: "outline" },
  SENT_TO_MANUFACTURER: { label: "Gửi NSX", variant: "outline" },
  RETURNED: { label: "Trả lại", variant: "secondary" },
  RETURNED_TO_SUPPLIER: { label: "Trả NCC", variant: "secondary" },
  REMOVED: { label: "Đã xóa", variant: "outline" },
  DISPOSED: { label: "Hủy", variant: "destructive" },
}

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("vi-VN")
}

export const ProductUnitListPage = () => {
  const user = useAuthStore((s) => s.user)
  const [page, setPage] = useState(0)
  const [data, setData] = useState<ResponsePage<ProductUnit> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [viewUnit, setViewUnit] = useState<ProductUnit | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

  useEffect(() => {
    getProducts(0, 500).then((res) => setProducts(res.content)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const hasFilters = debouncedSearch || statusFilter !== "all" || productFilter !== "all"

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    getProductUnits(page, 10)
      .then(setData)
      .catch((err) => setError((err as Error).message || "Không thể tải danh sách"))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { fetch() }, [fetch])

  const filtered = data?.content.filter((u) => {
    if (debouncedSearch && !u.serialNumber.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    if (statusFilter !== "all" && u.status !== statusFilter) return false
    if (productFilter !== "all" && u.productId !== Number(productFilter)) return false
    return true
  }) ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Sản phẩm trong kho</h1>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo serial..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(0) }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent className="max-h-[50vh]">
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={productFilter}
          onValueChange={(v) => { setProductFilter(v); setPage(0) }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sản phẩm" />
          </SelectTrigger>
          <SelectContent className="max-h-[50vh]">
            <SelectItem value="all">Tất cả</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name} ({p.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Ngày nhập</TableHead>
              <TableHead>BH đến</TableHead>
              <TableHead className="w-[80px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetch}>
                      <RefreshCw className="size-3 mr-1" /> Thử lại
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                  {hasFilters ? "Không có sản phẩm nào" : "Chưa có sản phẩm trong kho"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const s = statusBadge[u.status] ?? { label: u.status, variant: "secondary" }
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.serialNumber}</TableCell>
                    <TableCell>
                      <span className="font-medium">{u.productName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{u.productSku}</span>
                    </TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{u.locationCode ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{fmt(u.importedAt)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{fmt(u.warrantyExpiresAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setViewUnit(u); setViewOpen(true) }}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(0, page - 1))}
                className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {(() => {
              const t = data.pagination.totalPages, c = page
              const pages: (number | "ellipsis")[] = []
              if (t <= 7) { for (let i = 0; i < t; i++) pages.push(i) }
              else {
                pages.push(0)
                if (c > 3) pages.push("ellipsis")
                for (let i = Math.max(1, c - 2); i <= Math.min(t - 2, c + 2); i++) pages.push(i)
                if (c < t - 4) pages.push("ellipsis")
                pages.push(t - 1)
              }
              return pages.map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`e${i}`}>
                    <span className="px-2 text-muted-foreground">...</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === c} onClick={() => setPage(p)} className="cursor-pointer">
                      {p + 1}
                    </PaginationLink>
                  </PaginationItem>
                )
              )
            })()}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(data.pagination.totalPages - 1, page + 1))}
                className={page >= data.pagination.totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <ViewProductUnitModal unit={viewUnit} open={viewOpen} onOpenChange={setViewOpen} />
    </div>
  )
}
