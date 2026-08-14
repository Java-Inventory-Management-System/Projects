import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getImportReceiptById, cancelImportReceipt, rejectImportReceipt, resolveImportReceipt } from "@/services/import-service"
import { usePermission } from "@/hooks/use-permission"
import { invalidateDashboard } from "@/hooks/use-reports"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import { X, ScanLine, FileDown } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/utils/toast"
import { downloadCsv } from "@/utils/download-csv"
import { IMPORT_RECEIPT_STATUS } from "@/utils/types"
import { PrintReceiptButton } from "../components/print-receipt"

function resolutionLabel(t: (k: string) => string, resolution: string) {
  return resolution === "RETURNED_TO_SUPPLIER"
    ? t("importDetail.resolveReturned")
    : t("importDetail.resolveResending")
}

export function ImportDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [evidenceImage, setEvidenceImage] = useState("")
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveChoice, setResolveChoice] = useState("RETURNED_TO_SUPPLIER")
  const [resolveNote, setResolveNote] = useState("")

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    DRAFT: { label: t("importStatus.draft"), variant: "secondary" },
    RECEIVED: { label: t("importStatus.received"), variant: "default" },
    REJECTED: { label: t("importStatus.rejected"), variant: "destructive" },
    CANCELLED: { label: t("importStatus.cancelled"), variant: "destructive" },
  }

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["import-receipt", id],
    queryFn: () => getImportReceiptById(Number(id)),
    enabled: !!id,
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["import-receipt", id] })
    qc.invalidateQueries({ queryKey: ["import-receipts"] })
    qc.invalidateQueries({ queryKey: ["inventory"] })
    invalidateDashboard(qc)
    qc.invalidateQueries({ queryKey: ["import-pending-count"] })
  }

  const cancelMut = useMutation({
    mutationFn: () => cancelImportReceipt(Number(id)),
    onSuccess: () => {
      invalidateAll()
      toast.success(t("importDetail.cancelled"))
      setConfirmCancel(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rejectMut = useMutation({
    mutationFn: () =>
      rejectImportReceipt(Number(id), {
        reason: rejectReason.trim(),
        evidenceImageUrl: evidenceImage.split(",")[0] ?? "",
      }),
    onSuccess: () => {
      invalidateAll()
      toast.success(t("importDetail.rejected"))
      setRejectOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error(t("importDetail.rejectReasonRequired"))
      return
    }
    if (!evidenceImage) {
      toast.error(t("importDetail.rejectEvidenceRequired"))
      return
    }
    rejectMut.mutate()
  }

  const resolveMut = useMutation({
    mutationFn: () => resolveImportReceipt(Number(id), { resolution: resolveChoice, note: resolveNote.trim() || undefined }),
    onSuccess: () => {
      invalidateAll()
      toast.success(t("importDetail.resolveSuccess"))
      setResolveOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (!receipt)
    return (
      <Empty>
        <EmptyTitle>{t("importDetail.notFound")}</EmptyTitle>
      </Empty>
    )

  const s = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" }
  const isStock = perm.hasRole("STOCK")

  const handleDownloadCsv = () => {
    downloadCsv(
      `${receipt.receiptCode}.csv`,
      [t("table.product"), t("table.sku"), t("table.quantity"), t("table.unitPrice"), t("table.warranty"), t("table.total")],
      receipt.items.map((item) => [
        item.productName,
        item.productSku ?? "",
        String(item.quantity),
        (item.unitPrice ?? 0).toLocaleString("vi-VN"),
        item.warrantyMonths ? t("importDetail.warrantyMonths", { months: item.warrantyMonths }) : "—",
        ((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString("vi-VN"),
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/imports")}>{t("nav.imports")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{receipt.receiptCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{receipt.receiptCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {receipt.status === IMPORT_RECEIPT_STATUS.DRAFT && isStock && (
            <>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmCancel(true)}
                disabled={cancelMut.isPending}
              >
                <X className="size-4 mr-1" /> {t("importDetail.cancelReceipt")}
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => setRejectOpen(true)}>
                <X className="size-4 mr-1" /> {t("importDetail.rejectReceipt")}
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/stock/imports/new?id=${receipt.id}`)}>
                <ScanLine className="size-4 mr-1" /> {t("importDetail.enterSerials")}
              </Button>
            </>
          )}
          {receipt.status === IMPORT_RECEIPT_STATUS.REJECTED && perm.hasRole("MANAGER") && (
            <Button variant="secondary" onClick={() => setResolveOpen(true)}>
              <ScanLine className="size-4 mr-1" /> {t("importDetail.resolveAction")}
            </Button>
          )}
          <PrintReceiptButton id={receipt.id} type="import" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadCsv}>
            <FileDown className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("label.supplier")}</span>
              <p className="font-medium">{receipt.supplierName || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("importDetail.taskReceivedTime")}</span>
              <p className="font-medium">{new Date(receipt.updatedAt).toLocaleString("vi-VN")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.creator")}</span>
              <p className="font-medium">{receipt.createdByName || "—"}</p>
            </div>
            {receipt.status === IMPORT_RECEIPT_STATUS.REJECTED ? (
              <div>
                <span className="text-muted-foreground">{t("importDetail.rejectedBy")}</span>
                <p className="font-medium">
                  {receipt.rejectedByName ?? "—"}
                  {receipt.rejectedAt ? ` — ${new Date(receipt.rejectedAt).toLocaleString("vi-VN")}` : ""}
                </p>
              </div>
            ) : (
              <div>
                <span className="text-muted-foreground">{t("label.approver")}</span>
                <p className="font-medium">{receipt.approvedByName ?? "—"}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {receipt.note && (
        <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
          <span className="text-xs font-medium text-muted-foreground tracking-wide">{t("label.note")}</span>
          <p className="mt-1">{receipt.note}</p>
        </div>
      )}

      {receipt.status === IMPORT_RECEIPT_STATUS.REJECTED && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm space-y-2">
          <div>
            <span className="text-xs font-medium text-destructive tracking-wide">{t("importDetail.rejectReason")}</span>
            <p className="mt-1 leading-relaxed">{receipt.rejectReason ?? "—"}</p>
          </div>
          {receipt.evidenceImage && (
            <img
              src={receipt.evidenceImage}
              alt={t("importDetail.evidence")}
              className="max-h-64 rounded-md border object-contain"
            />
          )}
        </div>
      )}

      {receipt.status === IMPORT_RECEIPT_STATUS.REJECTED && receipt.resolution && (
        <div className="rounded-md border bg-primary/5 px-3 py-2.5 text-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{resolutionLabel(t, receipt.resolution)}</Badge>
            {receipt.resolvedByName && (
              <span className="text-xs text-muted-foreground">
                {t("importDetail.resolvedBy")}: {receipt.resolvedByName}
                {receipt.resolvedAt ? ` — ${new Date(receipt.resolvedAt).toLocaleString("vi-VN")}` : ""}
              </span>
            )}
          </div>
          {receipt.resolutionNote && <p className="leading-relaxed">{receipt.resolutionNote}</p>}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead className="w-16 text-right">{t("table.qty")}</TableHead>
                <TableHead className="w-16 text-right">{t("importDetail.received")}</TableHead>
                <TableHead className="w-24 text-right">{t("table.unitPrice")}</TableHead>
                <TableHead className="w-14 text-center">{t("table.warranty")}</TableHead>
                <TableHead className="w-24 text-right">{t("table.total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.productSku}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-700 dark:text-green-400">
                    {item.receivedQuantity ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(item.unitPrice ?? 0).toLocaleString("vi-VN")}₫
                  </TableCell>
                  <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                    {item.warrantyMonths ? t("importDetail.warrantyAbbr", { count: item.warrantyMonths }) : "—"}
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
        <span className="text-lg font-semibold">{t("importDetail.total")}: {(receipt.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("importDetail.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("importDetail.cancelConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? t("dialog.processing") : t("dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("importDetail.rejectDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("importDetail.rejectDialogDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                {t("importDetail.rejectReasonLabel")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("importDetail.rejectReasonPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("importDetail.evidenceLabel")} <span className="text-destructive">*</span>
              </Label>
              <ImageUpload value={evidenceImage} onChange={setEvidenceImage} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={rejectMut.isPending}>
              {rejectMut.isPending ? t("dialog.processing") : t("importDetail.confirmReject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("importDetail.resolveDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("importDetail.resolveDialogDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolveChoice("RETURNED_TO_SUPPLIER")}
                  className={`rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    resolveChoice === "RETURNED_TO_SUPPLIER"
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {t("importDetail.resolveReturned")}
                </button>
                <button
                  type="button"
                  onClick={() => setResolveChoice("SUPPLIER_RESENDING")}
                  className={`rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    resolveChoice === "SUPPLIER_RESENDING"
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {t("importDetail.resolveResending")}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t("importDetail.resolveHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolve-note">{t("importDetail.resolveNoteLabel")}</Label>
              <Textarea
                id="resolve-note"
                rows={2}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder={t("importDetail.resolveNotePlaceholder")}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolveMut.mutate()} disabled={resolveMut.isPending}>
              {resolveMut.isPending ? t("dialog.processing") : t("dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}