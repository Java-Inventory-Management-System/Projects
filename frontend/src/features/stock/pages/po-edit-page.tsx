import { useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useForm, useFieldArray } from "react-hook-form"
import { usePurchaseOrderById, useUpdatePurchaseOrder } from "@/hooks/use-purchase-orders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SerialModal } from "../components/serial-modal"
import { TRACKING_TYPE } from "@/utils/types"
import { toast } from "@/utils/toast"

interface EditItemFields {
  productId: number
  productName: string
  productSku: string
  trackingType: string | null
  quantity: number
  unitPrice: number
  serials: string[]
}

interface EditFormFields {
  items: EditItemFields[]
}

export function POEditPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: po, isLoading } = usePurchaseOrderById(Number(id))
  const updateMut = useUpdatePurchaseOrder()
  const navigatingAfterMut = useRef(false)
  const [serialModalFor, setSerialModalFor] = useState<number | null>(null)

  const form = useForm<EditFormFields>({
    values: {
      items:
        po?.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku ?? "",
          trackingType: i.trackingType ?? null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          serials: i.serials,
        })) ?? [],
    },
  })
  const { fields } = useFieldArray({ control: form.control, name: "items" })

  if (isLoading)
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (!po) return <p className="text-sm text-muted-foreground">{t("poDetail.notFound")}</p>
  if (po.locked)
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/stock/imports/purchase-orders/${po.id}`)}>
            &larr; {t("common.back")}
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{po.poCode}</h1>
          <Badge variant="secondary">{t("poEdit.locked")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("poEdit.lockedMessage")}</p>
      </div>
    )

  const onSubmit = form.handleSubmit((values) => {
    const invalid = values.items.find((i) => !i.quantity || i.quantity <= 0 || !i.unitPrice || i.unitPrice < 0)
    if (invalid) {
      toast.error(t("poCreate.invalidItem"))
      return
    }
    updateMut.mutate(
      {
        id: po.id,
        data: {
          items: values.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            serials: i.serials,
          })),
        },
      },
      {
        onSuccess: () => {
          navigatingAfterMut.current = true
          toast.success(t("poEdit.saveSuccess"))
          navigate(`/stock/imports/purchase-orders/${po.id}`)
        },
        onError: (e: Error) => {
          toast.error(e.message || t("poEdit.saveError"))
        },
      },
    )
  })

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/stock/imports/purchase-orders/${po.id}`)}>
          &larr; {t("common.back")}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          {t("poEdit.title")} {po.poCode}
        </h1>
        <Badge variant="secondary">{t("poEdit.hint")}</Badge>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.product")}</TableHead>
              <TableHead className="w-24 text-right">{t("table.qty")}</TableHead>
              <TableHead className="w-32 text-right">{t("table.unitPrice")}</TableHead>
              <TableHead className="w-44">{t("poEdit.serials")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-xs text-muted-foreground ml-1">{item.productSku}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={1}
                    className="h-8 w-20 text-right"
                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-28 text-right"
                    {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                  />
                </TableCell>
                <TableCell>
                  {item.trackingType !== TRACKING_TYPE.BULK ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setSerialModalFor(item.productId)}
                    >
                      {item.serials.length > 0
                        ? t("poEdit.editSerials", { count: item.serials.length })
                        : t("poEdit.addSerials")}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("poEdit.bulkNoSerial")}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate(`/stock/imports/purchase-orders/${po.id}`)}>
          {t("common.cancel")}
        </Button>
        <Button onClick={onSubmit} disabled={updateMut.isPending}>
          {updateMut.isPending ? t("poEdit.saving") : t("poEdit.save")}
        </Button>
      </div>

      {serialModalFor != null && (
        <SerialModal
          open={serialModalFor != null}
          onOpenChange={(open) => {
            if (!open) setSerialModalFor(null)
          }}
          productName={form.getValues(`items.${fields.findIndex((f) => f.productId === serialModalFor)}.productName`) ?? ""}
          productSku={form.getValues(`items.${fields.findIndex((f) => f.productId === serialModalFor)}.productSku`) ?? ""}
          required={form.getValues(`items.${fields.findIndex((f) => f.productId === serialModalFor)}.quantity`) ?? 0}
          serials={form.getValues(`items.${fields.findIndex((f) => f.productId === serialModalFor)}.serials`) ?? []}
          onSave={(serials) => {
            const idx = fields.findIndex((f) => f.productId === serialModalFor)
            if (idx >= 0) form.setValue(`items.${idx}.serials`, serials)
          }}
        />
      )}
    </div>
  )
}
