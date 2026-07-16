import { useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, AlertTriangle, MapPin, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { useInventory } from "@/hooks/use-inventory"
import type { InventoryItem } from "@/utils/types"
import { ViewInventoryModal } from "../components/view-inventory-modal"

export const InventoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const search = searchParams.get("q") ?? ""

  const [searchInput, setSearchInput] = useState(search)
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null)

  const { data: inventoryRes, isLoading: loading } = useInventory(page, 10, search)
  const items = inventoryRes?.content ?? []
  const pagination = inventoryRes?.pagination ?? null

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, val] of Object.entries(updates)) {
        if (val) next.set(key, val)
        else next.delete(key)
      }
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const handleSearch = () => updateParams({ q: searchInput || undefined, page: undefined })
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch() }

  const isLowStock = (item: InventoryItem) => item.quantity <= item.minStock

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Tồn kho</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm sản phẩm..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
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
              <TableHead>SKU</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="w-[80px] text-right">SL</TableHead>
              <TableHead className="w-[80px] text-right">Min</TableHead>
              <TableHead className="w-[90px] text-center">Trạng thái</TableHead>
              <TableHead className="w-[100px]">Vị trí</TableHead>
              <TableHead className="w-[70px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Không có hàng tồn kho.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const low = isLowStock(item)
                return (
                  <TableRow key={item.id} className={low ? "bg-red-50 dark:bg-red-950/20" : ""}>
                    <TableCell className="font-mono text-xs">{item.productSku}</TableCell>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className={`text-right tabular-nums ${low ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>
                      {item.quantity.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {item.minStock.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-center">
                      {low ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Thiếu
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-800">
                          Còn hàng
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {item.location}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setViewItem(item)}>
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

      <ViewInventoryModal item={viewItem} open={!!viewItem} onOpenChange={(v) => { if (!v) setViewItem(null) }} />
    </div>
  )
}
