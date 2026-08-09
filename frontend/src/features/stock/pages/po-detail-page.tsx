import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { usePurchaseOrderById, useCancelPurchaseOrder } from "@/hooks/use-purchase-orders"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ButtonGroup } from "@/components/ui/button-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { ArrowDownToLine, X } from "lucide-react"
import { PrintReceiptButton } from "../components/print-receipt"
import { toast } from "@/utils/toast"
import { PURCHASE_ORDER_STATUS } from "@/utils/types"

export function PODetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: po, isLoading } = usePurchaseOrderById(Number(id))
  const cancelMut = useCancelPurchaseOrder()

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    OPEN: { label: t("poStatus.open"), variant: "default" },
    PARTIAL: { label: t("poStatus.partial"), variant: "default" },
    COMPLETED: { label: t("poStatus.completed"), variant: "default" },
    CANCELLED: { label: t("poStatus.cancelled"), variant: "destructive" },
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (!po) return <p className="text-sm text-muted-foreground">{t("poDetail.notFound")}</p>

  const s = statusConfig[po.status] ?? { label: po.status, variant: "secondary" }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/purchase-orders")}>{t("nav.purchaseOrders")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{po.poCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{po.poCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <ButtonGroup>
          {po.status === PURCHASE_ORDER_STATUS.OPEN && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={cancelMut.isPending}
                >
                  <X className="size-4 mr-1" /> {t("poDetail.cancel")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("poDetail.cancelTitle")} {po.poCode}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">{t("poDetail.cancelConfirm")}</p>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      cancelMut.mutate(po.id, {
                        onSuccess: () => toast.success(t("poDetail.cancelSuccess")),
                        onError: (e) => toast.error(e.message),
                      })
                    }}
                    disabled={cancelMut.isPending}
                  >
                    {t("poDetail.cancel")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <PrintReceiptButton id={po.id} type="po" />
          {po.status !== PURCHASE_ORDER_STATUS.CANCELLED && (
            <Button onClick={() => navigate(`/stock/imports/new?poId=${po.id}`)}>
              <ArrowDownToLine className="size-4 mr-1" /> {t("poDetail.createImport")}
            </Button>
          )}
        </ButtonGroup>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("label.supplier")}</span>
              <p className="font-medium">{po.supplierName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("poDetail.expectedDate")}</span>
              <p className="font-medium">{new Date(po.expectedDate).toLocaleDateString("vi-VN")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.creator")}</span>
              <p className="font-medium">{po.createdByName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.createdDate")}</span>
              <p className="font-medium">{new Date(po.createdAt).toLocaleDateString("vi-VN")}</p>
            </div>
          </div>
          {po.note && (
            <div className="mt-4 rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">{t("label.note")}</span>
              <p className="mt-1">{po.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("poDetail.products")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead className="w-20 text-right">{t("table.qty")}</TableHead>
                <TableHead className="w-28 text-right">{t("table.unitPrice")}</TableHead>
                <TableHead className="w-28 text-right">{t("table.total")}</TableHead>
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
                  <TableCell className="text-right tabular-nums">
                    {(item.unitPrice ?? 0).toLocaleString("vi-VN")}₫
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString("vi-VN")}₫
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <span className="text-lg font-semibold">{t("poDetail.total")}: {(po.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>
      </div>
    </div>
  )
}
