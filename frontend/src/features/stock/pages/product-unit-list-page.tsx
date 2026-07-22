import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { getProductUnits } from "@/services/product-unit-service"
import { getProducts } from "@/services/product-service"
import { PRODUCT_UNIT_STATUS, type ProductUnit, type ResponsePage, type ProductResponse } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Eye, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DataTable, type Column } from "@/components/ui/data-table"
import { ViewProductUnitModal } from "../components/view-product-unit-modal"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: PRODUCT_UNIT_STATUS.IN_STOCK, label: "Trong kho" },
  { value: PRODUCT_UNIT_STATUS.SOLD, label: "Đã bán" },
  { value: PRODUCT_UNIT_STATUS.DEFECTIVE, label: "Lỗi" },
  { value: PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE, label: "Hư trong kho" },
  { value: PRODUCT_UNIT_STATUS.LOST, label: "Mất" },
  { value: PRODUCT_UNIT_STATUS.UNDER_REPAIR, label: "Đang sửa" },
  { value: PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER, label: "Gửi NSX" },
  { value: PRODUCT_UNIT_STATUS.RETURNED, label: "Trả lại" },
  { value: PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER, label: "Trả NCC" },
  { value: PRODUCT_UNIT_STATUS.REMOVED, label: "Đã xóa" },
  { value: PRODUCT_UNIT_STATUS.DISPOSED, label: "Hủy" },
]

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  [PRODUCT_UNIT_STATUS.IN_STOCK]: { label: "Trong kho", variant: "default" },
  [PRODUCT_UNIT_STATUS.SOLD]: { label: "Đã bán", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.DEFECTIVE]: { label: "Lỗi", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: { label: "Hư trong kho", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.LOST]: { label: "Mất", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.UNDER_REPAIR]: { label: "Đang sửa", variant: "outline" },
  [PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER]: { label: "Gửi NSX", variant: "outline" },
  [PRODUCT_UNIT_STATUS.RETURNED]: { label: "Trả lại", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER]: { label: "Trả NCC", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.REMOVED]: { label: "Đã xóa", variant: "outline" },
  [PRODUCT_UNIT_STATUS.DISPOSED]: { label: "Hủy", variant: "destructive" },
}

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("vi-VN")
}

export const ProductUnitListPage = () => {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [data, setData] = useState<ResponsePage<ProductUnit> | null>(null)
  const [allData, setAllData] = useState<ProductUnit[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState("desc")
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const [products, setProducts] = useState<ProductResponse[]>([])
  const [viewUnit, setViewUnit] = useState<ProductUnit | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)

  useEffect(() => {
    getProducts(0, 500)
      .then((res) => setProducts(res.content))
      .catch(() => {})
  }, [])

  const hasFilters = debouncedSearch || statusFilter !== "all" || productFilter !== "all"

  useEffect(() => {
    setLoading(true)
    setError(null)
    const sort = `importedAt,${sortOrder}`
    if (hasFilters) {
      getProductUnits(0, 10000, sort)
        .then((res) => {
          setAllData(res.content)
          setData(null)
        })
        .catch((err) => setError((err as Error).message || "Không thể tải danh sách"))
        .finally(() => setLoading(false))
    } else {
      getProductUnits(page, pageSize, sort)
        .then((res) => {
          setData(res)
          setAllData(null)
        })
        .catch((err) => setError((err as Error).message || "Không thể tải danh sách"))
        .finally(() => setLoading(false))
    }
  }, [page, hasFilters, debouncedSearch, statusFilter, productFilter, sortOrder])

  const filtered = (allData ?? data?.content ?? []).filter((u) => {
    if (debouncedSearch && !u.serialNumber.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    if (statusFilter !== "all" && u.status !== statusFilter) return false
    if (productFilter !== "all" && u.productId !== Number(productFilter)) return false
    return true
  })

  const columns: Column<ProductUnit>[] = [
    {
      header: "Serial",
      sortKey: "serialNumber",
      render: (u) => <span className="font-mono text-xs">{u.serialNumber}</span>,
    },
    {
      header: "Sản phẩm",
      render: (u) => (
        <>
          <span className="font-medium">{u.productName}</span>
          <span className="text-xs text-muted-foreground ml-2">{u.productSku}</span>
        </>
      ),
    },
    {
      header: "Trạng thái",
      render: (u) => {
        const s = statusBadge[u.status] ?? { label: u.status, variant: "secondary" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    { header: "Vị trí", render: (u) => <span className="text-muted-foreground">{u.locationCode ?? "—"}</span> },
    {
      header: "Ngày nhập",
      sortKey: "importedAt",
      render: (u) => <span className="text-muted-foreground text-xs">{fmt(u.importedAt)}</span>,
    },
    {
      header: "BH đến",
      render: (u) => <span className="text-muted-foreground text-xs">{fmt(u.warrantyExpiresAt)}</span>,
    },
    {
      header: "Thao tác",
      className: "w-[80px]",
      render: (u) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setViewUnit(u)
                setViewOpen(true)
              }}
            >
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Xem chi tiết</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Sản phẩm trong kho</h1>

      <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo serial..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              {filterOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              Bộ lọc
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v || "all")
                setPage(0)
              }}
            >
              {statusOptions.slice(0, 5).map((o) => (
                <ToggleGroupItem key={o.value} value={o.value} size="sm" className="text-xs">
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select
              value={productFilter}
              onValueChange={(v) => {
                setProductFilter(v)
                setPage(0)
              }}
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
            <Select
              value={sortOrder}
              onValueChange={(v) => {
                setSortOrder(v)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mới nhất</SelectItem>
                <SelectItem value="asc">Cũ nhất</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage(0)
              setSearch("")
              setStatusFilter("all")
              setProductFilter("all")
            }}
          >
            <RefreshCw className="size-3 mr-1" /> Thử lại
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={loading}
          emptyMessage={hasFilters ? "Không có sản phẩm nào" : "Chưa có sản phẩm trong kho"}
          sort={sort}
          onSort={handleSort}
          totalElements={data?.pagination.totalElements}
          page={page}
          totalPages={data?.pagination.totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(0)
          }}
        />
      )}

      <ViewProductUnitModal unit={viewUnit} open={viewOpen} onOpenChange={setViewOpen} />
    </div>
  )
}
