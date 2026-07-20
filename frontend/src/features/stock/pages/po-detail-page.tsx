import { useParams, useNavigate } from "react-router-dom"
import { usePurchaseOrderById, useCancelPurchaseOrder } from "@/hooks/use-purchase-orders"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ButtonGroup } from "@/components/ui/button-group"
import { ArrowDownToLine, X } from "lucide-react"
import { toast } from "@/utils/toast"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Nháp", variant: "secondary" },
  PARTIAL: { label: "Giao một phần", variant: "default" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

export function PODetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: po, isLoading } = usePurchaseOrderById(Number(id))
  const cancelMut = useCancelPurchaseOrder()

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>
  if (!po) return <p className="text-sm text-muted-foreground">Không tìm thấy đơn hàng</p>

  const s = statusConfig[po.status] ?? { label: po.status, variant: "secondary" }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/stock/purchase-orders")}>Đơn đặt hàng</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{po.poCode}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{po.poCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <ButtonGroup>
          {po.status === "DRAFT" && (
            <Button variant="outline" className="text-destructive" onClick={() => {
              cancelMut.mutate(po.id, {
                onSuccess: () => toast.success("Đã hủy đơn hàng"),
                onError: (e) => toast.error(e.message),
              })
            }} disabled={cancelMut.isPending}>
              <X className="size-4 mr-1" /> Hủy
            </Button>
          )}
          <Button onClick={() => navigate(`/stock/imports/new?poId=${po.id}`)}>
            <ArrowDownToLine className="size-4 mr-1" /> Tạo phiếu nhập
          </Button>
        </ButtonGroup>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">NCC:</span><p className="font-medium">{po.supplierName}</p></div>
            <div><span className="text-muted-foreground">Ngày giao dự kiến:</span><p className="font-medium">{new Date(po.expectedDate).toLocaleDateString("vi-VN")}</p></div>
            <div><span className="text-muted-foreground">Người tạo:</span><p className="font-medium">{po.createdByName}</p></div>
            <div><span className="text-muted-foreground">Ngày tạo:</span><p className="font-medium">{new Date(po.createdAt).toLocaleDateString("vi-VN")}</p></div>
          </div>
          {po.note && (
            <div className="mt-4 rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">GHI CHÚ</span>
              <p className="mt-1">{po.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sản phẩm</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="w-20 text-right">SL</TableHead>
                <TableHead className="w-28 text-right">Đơn giá</TableHead>
                <TableHead className="w-28 text-right">Thành tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-xs text-muted-foreground ml-1">{item.productSku}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.unitPrice.toLocaleString("vi-VN")}₫</TableCell>
                  <TableCell className="text-right tabular-nums">{(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <span className="text-lg font-semibold">Tổng: {po.totalAmount.toLocaleString("vi-VN")}₫</span>
      </div>
    </div>
  )
}
