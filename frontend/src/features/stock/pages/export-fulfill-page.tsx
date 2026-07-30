import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getExportReceiptById, fulfillExportReceipt } from "@/services/export-service"
import { getAllSerialsForProduct } from "@/services/product-unit-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/utils/toast"
import { EXPORT_RECEIPT_STATUS, type ProductUnit } from "@/utils/types"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { ScanLine } from "lucide-react"

export function ExportFulfillPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING: { label: t("exportStatus.pending"), variant: "outline" },
    APPROVED: { label: t("exportStatus.approved"), variant: "secondary" },
    COMPLETED: { label: t("exportStatus.completed"), variant: "default" },
    CANCELLED: { label: t("exportStatus.cancelled"), variant: "destructive" },
  }
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [serialPicker, setSerialPicker] = useState<{ exportItemId: number; productId: number; productName: string } | null>(null)
  const [allSerials, setAllSerials] = useState<ProductUnit[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [serialsPerItem, setSerialsPerItem] = useState<Record<number, string[]>>({})
  const [serialsLoading, setSerialsLoading] = useState(false)

  const [fulfilledQtys, setFulfilledQtys] = useState<Record<number, number>>({})

  const { scanning, barcodeInput, setBarcodeInput, videoRef, stopCamera, toggleCamera } = useBarcodeScanner(
    (rawValue) => {
      if (!serialPicker) return
      const match = allSerials.find((s) => s.serialNumber === rawValue)
      if (match && !selectedIds.includes(match.id)) {
        setSelectedIds((prev) => [...prev, match.id])
        toast.success(t("exportFulfill.scanned", { serial: rawValue }))
      }
    }
  )

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["export-receipt", id],
    queryFn: () => getExportReceiptById(Number(id)),
    enabled: !!id,
  })

  const isSerialized = (item: { trackingType?: string }) => item.trackingType === "SERIALIZED"

  const itemsWithTracking = useMemo(() => {
    if (!receipt) return []
    return receipt.items
  }, [receipt])

  useEffect(() => {
    if (!receipt) return
    const initial: Record<number, number> = {}
    receipt.items.forEach((item) => { initial[item.id] = item.quantity })
    setFulfilledQtys(initial)
  }, [receipt])

  const openSerialPicker = async (item: typeof itemsWithTracking[0]) => {
    setSerialPicker({ exportItemId: item.id, productId: item.productId, productName: item.productName })
    setSerialsLoading(true)
    const all = await getAllSerialsForProduct(item.productId)
    setAllSerials(all)
    const saved = serialsPerItem[item.id]
    if (saved?.length) {
      const ids = all.filter((s) => saved.includes(s.serialNumber)).map((s) => s.id)
      setSelectedIds(ids)
    } else {
      setSelectedIds([])
    }
    setSerialsLoading(false)
  }

  const fulfillMut = useMutation({
    mutationFn: () => {
      if (!receipt) throw new Error("No receipt")
      return fulfillExportReceipt(receipt.id, {
        items: receipt.items.map((item) => {
          if (isSerialized(item)) {
            return { itemId: item.id, serialNumbers: serialsPerItem[item.id] ?? [] }
          }
          return { itemId: item.id, actualQuantity: fulfilledQtys[item.id] ?? 0 }
        }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["export-receipt", id] })
      qc.invalidateQueries({ queryKey: ["export-receipts"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["inventory-summary"] })
      toast.success(t("exportFulfill.success"))
      navigate(`/stock/exports/${receipt!.id}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!receipt) return <Empty><EmptyTitle>{t("exportFulfill.notFound")}</EmptyTitle></Empty>

  const s = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" as const }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/stock/exports")}>{t("nav.exports")}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{t("exportFulfill.breadcrumb", { code: receipt.receiptCode })}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{receipt.receiptCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">{t("label.reason")}</span><p className="font-medium">{receipt.reason}</p></div>
            <div><span className="text-muted-foreground">{t("label.createdDate")}</span><p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p></div>
            {receipt.customerName && <div><span className="text-muted-foreground">{t("label.customer")}</span><p className="font-medium">{receipt.customerName}</p></div>}
            <div><span className="text-muted-foreground">{t("label.creator")}</span><p className="font-medium">{receipt.createdByName || "—"}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead className="w-16 text-right">{t("exportFulfill.requested")}</TableHead>
                <TableHead className="w-20 text-right">{t("exportFulfill.type")}</TableHead>
                <TableHead className="w-24 text-right">{t("exportFulfill.actual")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsWithTracking.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.productSku}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-[10px]">
                      {isSerialized(item) ? t("trackingType.serialized") : t("trackingType.bulk")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isSerialized(item) ? (
                      <Button variant="outline" size="sm" onClick={() => openSerialPicker(item)}>
                        {serialsPerItem[item.id]?.length ? t("exportFulfill.selectedSerial", { count: serialsPerItem[item.id].length }) : t("exportFulfill.selectSerial")}
                      </Button>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        className="h-8 w-20 text-right ml-auto"
                        value={fulfilledQtys[item.id] ?? item.quantity}
                        onChange={(e) => setFulfilledQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {receipt.status === EXPORT_RECEIPT_STATUS.APPROVED && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate("/stock/exports")}>{t("common.back")}</Button>
          <Button onClick={() => setConfirmOpen(true)}>{t("exportFulfill.confirmFulfill")}</Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(v) => { if (!v) setConfirmOpen(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("exportFulfill.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("exportFulfill.confirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { fulfillMut.mutate(); setConfirmOpen(false) }} disabled={fulfillMut.isPending}>
              {fulfillMut.isPending ? t("dialog.processing") : t("exportFulfill.confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!serialPicker} onOpenChange={(v) => { if (!v) { setSerialPicker(null); stopCamera() } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("exportFulfill.selectSerialTitle")}</DialogTitle>
            <DialogDescription>{t("exportFulfill.selectSerialDescription", { productName: serialPicker?.productName ?? "" })}</DialogDescription>
          </DialogHeader>

          {scanning && (
            <div className="relative rounded-lg overflow-hidden bg-muted mb-2">
              <video ref={videoRef} className="w-full h-48 object-cover" playsInline muted />
                <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={stopCamera}>
                  {t("exportFulfill.stopScan")}
                </Button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={toggleCamera}>
              <ScanLine className="size-4 mr-1.5" />
              {scanning ? t("exportFulfill.scanning") : t("exportFulfill.scan")}
            </Button>
            <Input
              placeholder={t("exportFulfill.serialInputPlaceholder")}
              className="h-8 text-sm"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !barcodeInput.trim()) return
                const match = allSerials.find((s) => s.serialNumber === barcodeInput.trim())
                if (match) {
                  if (!selectedIds.includes(match.id)) {
                    setSelectedIds((prev) => [...prev, match.id])
                  }
                  setBarcodeInput("")
                } else {
                  toast.error(t("exportFulfill.serialNotFound"))
                }
              }}
            />
          </div>

          {serialsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : allSerials.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("exportFulfill.noSerials")}</div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto space-y-1 -mx-6 px-6">
              {allSerials.map((s) => {
                const checked = selectedIds.includes(s.id)
                return (
                  <label key={s.id} className={`flex items-center gap-3 rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
                    checked ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted"
                  }`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => setSelectedIds((prev) => checked ? prev.filter((id) => id !== s.id) : [...prev, s.id])}
                      className="size-4" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-medium truncate">{s.serialNumber}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.locationCode ?? "—"} · {new Date(s.importedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => { setSerialPicker(null); stopCamera() }} className="w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
            <Button onClick={() => {
              if (!serialPicker) return
              const serialNumbers = allSerials.filter((s) => selectedIds.includes(s.id)).map((s) => s.serialNumber)
              setSerialsPerItem((prev) => ({ ...prev, [serialPicker.exportItemId]: serialNumbers }))
              setSerialPicker(null)
              stopCamera()
            }} disabled={selectedIds.length === 0} className="w-full sm:w-auto">
              {t("exportFulfill.confirmSerial", { count: selectedIds.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}