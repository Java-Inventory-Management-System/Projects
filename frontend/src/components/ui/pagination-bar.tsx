import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PaginationBarProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

const PAGE_SIZES = [10, 20, 50, 100]

function pages(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const p: (number | "ellipsis")[] = [0]
  if (current > 3) p.push("ellipsis")
  for (let i = Math.max(1, current - 2); i <= Math.min(total - 2, current + 2); i++) p.push(i)
  if (current < total - 4) p.push("ellipsis")
  p.push(total - 1)
  return p
}

export function PaginationBar({ page, totalPages, onChange, pageSize, onPageSizeChange }: PaginationBarProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {pageSize && onPageSizeChange && (
          <>
            <span>Hiển thị</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-8 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>kết quả</span>
          </>
        )}
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onChange(Math.max(0, page - 1))}
              className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pages(page, totalPages).map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`e${i}`}>
                <span className="px-2 text-muted-foreground">...</span>
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink isActive={p === page} onClick={() => onChange(p)} className="cursor-pointer">
                  {p + 1}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
              className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
