import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination"

interface PaginationBarProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

function pages(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const p: (number | "ellipsis")[] = [0]
  if (current > 3) p.push("ellipsis")
  for (let i = Math.max(1, current - 2); i <= Math.min(total - 2, current + 2); i++) p.push(i)
  if (current < total - 4) p.push("ellipsis")
  p.push(total - 1)
  return p
}

export function PaginationBar({ page, totalPages, onChange }: PaginationBarProps) {
  if (totalPages <= 1) return null
  return (
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
  )
}
