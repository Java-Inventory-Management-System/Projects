import { useState } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/ui/data-table"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { useProducts } from "@/hooks/use-products"
import { useBrands } from "@/hooks/use-brands"
import { useCategories } from "@/hooks/use-categories"
import type { ProductResponse } from "@/utils/types"
import { ViewProductModal } from "../components/view-product-modal"

const PAGE_SIZE = 20

export const ProductsPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const brandFilter = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : undefined
  const categoryFilter = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "")
  const [page, setPage] = useState(0)
  const [viewProduct, setViewProduct] = useState<ProductResponse | null>(null)

  const debouncedSearch = useDebounce(searchInput, 300)

  const { data, isLoading } = useProducts(page, PAGE_SIZE, debouncedSearch || undefined, brandFilter, categoryFilter)
  const brands = useBrands().data ?? []
  const categories = useCategories().data ?? []

  const products = data?.content ?? []
  const totalPages = data?.pagination.totalPages ?? 0

  const hasFilters = debouncedSearch || brandFilter || categoryFilter

  const columns: Column<ProductResponse>[] = [
    { header: "SKU", className: "w-[110px]", render: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    { header: "Tên", render: (p) => <span className="font-medium">{p.name}</span> },
    { header: "Thương hiệu", className: "w-[120px]", render: (p) => <span className="text-muted-foreground">{p.brandName}</span> },
    { header: "Danh mục", className: "w-[120px]", render: (p) => <span className="text-muted-foreground">{p.categoryName}</span> },
    { header: "ĐVT", className: "w-[60px]", render: (p) => <span>{p.unit}</span> },
    { header: "Giá", className: "w-[80px] text-right", render: (p) => <span className="tabular-nums">{p.sellPrice?.toLocaleString("vi-VN")}</span> },
    { header: "Trạng thái", className: "w-[70px] text-center", render: (p) => <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Hoạt động" : "Ngừng"}</Badge> },
    { header: "", className: "w-[70px]", render: (p) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => setViewProduct(p)}>
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate(`/products/${p.id}`)}>
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Sản phẩm</h1>
        <Button onClick={() => navigate("/products/new")}>
          <Plus className="size-4 mr-1" /> Thêm sản phẩm
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm tên hoặc SKU..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(0) }}
          />
        </div>
        <Select
          value={brandFilter ? String(brandFilter) : "all"}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            if (v === "all") next.delete("brandId")
            else next.set("brandId", v)
            setSearchParams(next)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Thương hiệu" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter ? String(categoryFilter) : "all"}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            if (v === "all") next.delete("categoryId")
            else next.set("categoryId", v)
            setSearchParams(next)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Danh mục" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); setSearchParams(new URLSearchParams()); setPage(0) }}>
            Xoá
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyMessage={hasFilters ? "Không tìm thấy sản phẩm nào" : "Không có sản phẩm nào"}
      />

      {totalPages > 1 && <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />}

      <p className="text-xs text-muted-foreground">{data?.pagination.totalElements ?? 0} sản phẩm</p>

      <ViewProductModal product={viewProduct} open={!!viewProduct} onOpenChange={(v) => { if (!v) setViewProduct(null) }} />
    </div>
  )
}
