import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { getImportReceipts } from "@/mock-services"
import type { ImportReceipt, ResponsePage } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Eye } from "lucide-react"
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

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Nháp", variant: "secondary" },
  pending_approval: { label: "Chờ duyệt", variant: "outline" },
  completed: { label: "Hoàn tất", variant: "default" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
}

export function ImportListPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [data, setData] = useState<ResponsePage<ImportReceipt> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    setLoading(true)
    getImportReceipts(page, 10).then((res) => {
      setData(res)
      setLoading(false)
    })
  }, [page])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Nhập kho</h1>
        <Button onClick={() => navigate("/stock/imports/new")}>
          <Plus className="size-4 mr-1" />
          Tạo phiếu nhập
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã phiếu</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Người tạo</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-10" />
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
            ) : !data || data.content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Chưa có phiếu nhập nào.
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((r) => {
                const s = statusLabel[r.status] ?? { label: r.status, variant: "secondary" }
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.receiptCode}</TableCell>
                    <TableCell className="font-medium">{r.supplierName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.totalAmount.toLocaleString("vi-VN")}₫
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.createdByName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/imports/${r.id}`)}>
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
            {Array.from({ length: data.pagination.totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink isActive={i === page} onClick={() => setPage(i)} className="cursor-pointer">
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(data.pagination.totalPages - 1, page + 1))}
                className={page >= data.pagination.totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
