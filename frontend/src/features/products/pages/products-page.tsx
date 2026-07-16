import { useState, useCallback } from "react"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useProducts } from "@/hooks/use-products"
import { useBrands } from "@/hooks/use-brands"
import { useCategories } from "@/hooks/use-categories"
import type { ProductResponse } from "@/utils/types"
import { ViewProductModal } from "../components/view-product-modal"

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const search = searchParams.get("q") ?? ""
  const brandId = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : undefined
  const categoryId = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined

  const [searchInput, setSearchInput] = useState(search)
  const [viewProduct, setViewProduct] = useState<ProductResponse | null>(null)

  const { data: productsRes, isLoading: loading } = useProducts(page, 10, search, brandId, categoryId)
  const brands = useBrands().data ?? []
  const categories = useCategories().data ?? []

  const products = productsRes?.content ?? []
  const pagination = productsRes?.pagination ?? null

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      if (next.get("page") !== "0") next.set("page", "0")
      for (const [key, val] of Object.entries(updates)) {
        if (val) next.set(key, val)
        else next.delete(key)
      }
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const handleSearch = () => updateParams({ q: searchInput || undefined })
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch() }

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
            onKeyDown={handleKeyDown}
          />
        </div>
        <Select
          value={brandId ? String(brandId) : "all"}
          onValueChange={(v) => updateParams({ brandId: v === "all" ? undefined : v })}
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
          value={categoryId ? String(categoryId) : "all"}
          onValueChange={(v) => updateParams({ categoryId: v === "all" ? undefined : v })}
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
        {search && (
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
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  Không có sản phẩm nào.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
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

      {pagination && pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => updateParams({ page: String(Math.max(0, page - 1)) })}
                className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {(() => {
              const t = pagination.totalPages, c = page
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
                    <PaginationLink
                      isActive={p === c}
                      onClick={() => updateParams({ page: String(p) })}
                      className="cursor-pointer"
                    >
                      {p + 1}
                    </PaginationLink>
                  </PaginationItem>
                )
              )
            })()}
            <PaginationItem>
              <PaginationNext
                onClick={() => updateParams({ page: String(Math.min(pagination.totalPages - 1, page + 1)) })}
                className={page >= pagination.totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <ViewProductModal product={viewProduct} open={!!viewProduct} onOpenChange={(v) => { if (!v) setViewProduct(null) }} />
    </div>
  )
}
