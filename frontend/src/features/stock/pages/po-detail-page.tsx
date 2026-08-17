import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { usePurchaseOrderById, usePurchaseOrderReceipts, useCancelPurchaseOrder, useOpenPurchaseOrder } from "@/hooks/use-purchase-orders"
import { toKey, PO_STATUS_VARIANT, IMPORT_STATUS_VARIANT } from "@/utils/labels"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowDownToLine, Link2, X, Pencil } from "lucide-react"
import { PrintReceiptButton } from "../components/print-receipt"
import { toast } from "@/utils/toast"
import { PURCHASE_ORDER_STATUS } from "@/utils/types"

export function PODetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const perm = usePermission()
  const { data: po, isLoading } = usePurchaseOrderById(Number(id))
  const { data: receipts } = usePurchaseOrderReceipts(Number(id))
  const cancelMut = useCancelPurchaseOrder()
  const openMut = useOpenPurchaseOrder()
  const [asnCode, setAsnCode] = useState("")

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (!po) return <p className="text-sm text-muted-foreground">{t("poDetail.notFound")}</p>

  const s = { label: t(`poStatus.${toKey(po.status)}`), variant: PO_STATUS_VARIANT[po.status] }
  const isManager = perm.hasRole(...ROLES.MANAGER)
  const isStock = perm.hasRole("STOCK")

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
          {(po.status === PURCHASE_ORDER_STATUS.DRAFT || po.status === PURCHASE_ORDER_STATUS.OPEN) &&
            !po.locked &&
            isManager && (
              <Button variant="outline" onClick={() => navigate(`/stock/imports/purchase-orders/${po.id}/edit`)}>
                <Pencil className="size-4 mr-1" /> {t("poDetail.edit")}
              </Button>
            )}
          {po.locked && (
            <Badge variant="secondary" className="self-center">
              {t("poDetail.locked")}
            </Badge>
          )}
          {po.status === PURCHASE_ORDER_STATUS.DRAFT && isManager && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Link2 className="size-4 mr-1" /> {t("poDetail.openOrder")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("poDetail.openOrderTitle")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="asn-code">{t("poDetail.asnCode")}</Label>
                  <Input
                    id="asn-code"
                    placeholder={t("poDetail.asnCodePlaceholder")}
                    value={asnCode}
                    onChange={(e) => setAsnCode(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{t("poDetail.openOrderConfirm")}</p>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      openMut.mutate(
                        { id: po.id, asnCode: asnCode.trim() || undefined },
                        {
                          onSuccess: () => {
                            toast.success(t("poDetail.openSuccess"))
                            setAsnCode("")
                          },
                          onError: (e) => toast.error(e.message),
                        },
                      )
                    }}
                    disabled={openMut.isPending}
                  >
                    {openMut.isPending ? t("poDetail.opening") : t("poDetail.confirmOpen")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {(po.status === PURCHASE_ORDER_STATUS.DRAFT || po.status === PURCHASE_ORDER_STATUS.OPEN) && isManager && (
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
          {po.status === PURCHASE_ORDER_STATUS.OPEN && isStock && (
            <Button onClick={() => navigate(`/stock/imports/new?poId=${po.id}`)}>
              <ArrowDownToLine className="size-4 mr-1" /> {t("poDetail.createImport")}
            </Button>
          )}
        </ButtonGroup>
      </div>

      {(po.rejectedReceiptCount ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("poDetail.rejectedBanner", { count: po.rejectedReceiptCount })}
          </AlertDescription>
        </Alert>
      )}

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
              <span className="text-muted-foreground">{t("poDetail.invoiceCode")}</span>
              <p className="font-medium font-mono">{po.invoiceCode ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("poDetail.asnCode")}</span>
              <p className="font-medium font-mono">{po.asnCode ?? "—"}</p>
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
                <TableHead className="w-40">{t("poDetail.serials")}</TableHead>
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
                  <TableCell>
                    {item.serials.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.serials.map((s) => (
                          <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("poDetail.receipts")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {receipts && receipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.receiptCode")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("poDetail.rejectInfo")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((r) => {
                  const rs = { label: t(`importStatus.${toKey(r.status)}`), variant: IMPORT_STATUS_VARIANT[r.status] }
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <a
                          href={`/stock/imports/${r.id}`}
                          className="font-mono text-xs font-medium underline-offset-4 hover:underline"
                        >
                          {r.receiptCode}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rs.variant}>{rs.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "REJECTED" ? (
                          <div className="text-sm">
                            <p className="text-destructive">{r.rejectReason}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("poDetail.rejectedBy", { name: r.rejectedByName ?? "—" })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">{t("poDetail.noReceipts")}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <span className="text-lg font-semibold">{t("poDetail.total")}: {(po.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>
      </div>
    </div>
  )
}