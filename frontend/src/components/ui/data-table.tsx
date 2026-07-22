import type { ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/utils/cn"

export interface Column<T> {
  header: ReactNode
  className?: string
  render: (item: T) => ReactNode
  sortKey?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading: boolean
  emptyMessage?: string
  skeletonRows?: number
  sort?: { key: string; dir: "asc" | "desc" }
  onSort?: (key: string) => void
  totalElements?: number
  page?: number
  totalPages?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export function DataTable<T>({
  columns, data, isLoading, emptyMessage = "Chưa có dữ liệu", skeletonRows = 5,
  sort, onSort,
  totalElements, page, totalPages, pageSize, onPageChange, onPageSizeChange,
}: DataTableProps<T>) {
  const hasPagination = page !== undefined && totalPages !== undefined && onPageChange !== undefined

  const toolbar = hasPagination && (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {totalElements !== undefined && <span>{totalElements.toLocaleString("vi-VN")} kết quả</span>}
        {pageSize !== undefined && onPageSizeChange && (
          <>
            <span>Hiển thị</span>
            <select
              value={String(pageSize)}
              onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange?.(0) }}
              className="h-7 rounded border bg-transparent px-1 text-xs outline-none"
            >
              {[10, 20, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </>
        )}
      </div>
      <div className="flex justify-center sm:justify-end">
        <PaginationBar page={page!} totalPages={totalPages!} onChange={onPageChange} />
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      {toolbar}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead
                  key={i}
                  onClick={c.sortKey && onSort ? () => onSort(c.sortKey!) : undefined}
                  className={cn(c.className, c.sortKey && "cursor-pointer select-none")}
                >
                  <div className="inline-flex items-center gap-1 font-medium">
                    {c.header}
                    {c.sortKey && onSort && (sort?.key === c.sortKey ? (
                      sort.dir === "asc"
                        ? <ArrowUp className="size-3.5 text-blue-600" />
                        : <ArrowDown className="size-3.5 text-blue-600" />
                    ) : (
                      <ArrowUp className="size-3.5 text-muted-foreground/50" />
                    ))}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((c, j) => (
                    <TableCell key={j} className={c.className}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <Empty><EmptyTitle>{emptyMessage}</EmptyTitle></Empty>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, i) => (
                <TableRow key={i} style={{ contentVisibility: "auto" } as React.CSSProperties}>
                  {columns.map((c, j) => (
                    <TableCell key={j} className={c.className}>{c.render(item)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {toolbar}
    </div>
  )
}
