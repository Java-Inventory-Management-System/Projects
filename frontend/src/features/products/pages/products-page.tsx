import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useProducts } from "@/hooks/use-products"
import { useBrands } from "@/hooks/use-brands"
import { useCategories } from "@/hooks/use-categories"
import type { ProductResponse } from "@/utils/types"
import { ViewProductModal } from "../components/view-product-modal"

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("q") ?? ""
  const brandFilter = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : undefined
  const categoryFilter = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined

  const [searchInput, setSearchInput] = useState(search)
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [viewProduct, setViewProduct] = useState<ProductResponse | null>(null)

  const hasFilters = debouncedSearch || brandFilter || categoryFilter

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: allProducts } = useProducts(0, 10000)
  const brands = useBrands().data ?? []
  const categories = useCategories().data ?? []

  const filtered = useMemo(() => {
    const source = allProducts?.content ?? []
    return source.filter((p) => {
      if (debouncedSearch) {
        const kw = debouncedSearch.toLowerCase()
        if (!p.name.toLowerCase().includes(kw) && !(p.sku ?? "").toLowerCase().includes(kw)) return false
      }
      if (brandFilter && p.brandId !== brandFilter) return false
      if (categoryFilter && p.categoryId !== categoryFilter) return false
      return true
    })
  }, [allProducts, debouncedSearch, brandFilter, categoryFilter])

  const loading = !allProducts

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Sản phẩm</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm tên hoặc SKU..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={brandFilter ? String(brandFilter) : "all"}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            next.set("page", "0")
            if (v === "all") next.delete("brandId")
            else next.set("brandId", v)
            setSearchParams(next)
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Thương hiệu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter ? String(categoryFilter) : "all"}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            next.set("page", "0")
            if (v === "all") next.delete("categoryId")
            else next.set("categoryId", v)
            setSearchParams(next)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(debouncedSearch || brandFilter || categoryFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); setSearchParams(new URLSearchParams()) }}>
            Xoá
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">SKU</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead className="w-[120px]">Thương hiệu</TableHead>
              <TableHead className="w-[120px]">Danh mục</TableHead>
              <TableHead className="w-[60px]">ĐVT</TableHead>
              <TableHead className="w-[80px] text-right">Giá</TableHead>
              <TableHead className="w-[70px] text-center">Trạng thái</TableHead>
              <TableHead className="w-[70px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  {hasFilters ? "Không tìm thấy sản phẩm nào" : "Không có sản phẩm nào."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.brandName}</TableCell>
                  <TableCell className="text-muted-foreground">{p.categoryName}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.sellPrice?.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.isActive ? "default" : "secondary"}>
                      {p.isActive ? "Hoạt động" : "Ngừng"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setViewProduct(p)}>
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!hasFilters && <p className="text-xs text-muted-foreground">Tổng: {allProducts?.pagination.totalElements ?? 0} sản phẩm</p>}
      {hasFilters && <p className="text-xs text-muted-foreground">Tìm thấy {filtered.length} sản phẩm</p>}

      <ViewProductModal product={viewProduct} open={!!viewProduct} onOpenChange={(v) => { if (!v) setViewProduct(null) }} />
    </div>
  )
}
