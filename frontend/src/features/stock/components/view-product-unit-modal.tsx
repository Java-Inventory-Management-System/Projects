import { PRODUCT_UNIT_STATUS, TRACKING_TYPE, type ProductUnit } from "@/utils/types"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("vi-VN")
}

function fmtFull(d: string) {
  return new Date(d).toLocaleString("vi-VN")
}

export const ViewProductUnitModal = ({
  unit,
  open,
  onOpenChange,
}: {
  unit: ProductUnit | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) => {
  if (!unit) return null
  const { t } = useTranslation()
  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    [PRODUCT_UNIT_STATUS.IN_STOCK]: { label: t("unitStatus.inStock"), variant: "default" },
    [PRODUCT_UNIT_STATUS.SOLD]: { label: t("unitStatus.sold"), variant: "secondary" },
    [PRODUCT_UNIT_STATUS.DEFECTIVE]: { label: t("unitStatus.defective"), variant: "destructive" },
    [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: { label: t("unitStatus.damagedInStorage"), variant: "destructive" },
    [PRODUCT_UNIT_STATUS.LOST]: { label: t("unitStatus.lost"), variant: "destructive" },
    [PRODUCT_UNIT_STATUS.UNDER_REPAIR]: { label: t("unitStatus.underRepair"), variant: "outline" },
    [PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER]: { label: t("unitStatus.sentToManufacturer"), variant: "outline" },
    [PRODUCT_UNIT_STATUS.RETURNED]: { label: t("unitStatus.returned"), variant: "secondary" },
    [PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER]: { label: t("unitStatus.returnedToSupplier"), variant: "secondary" },
    [PRODUCT_UNIT_STATUS.REMOVED]: { label: t("unitStatus.removed"), variant: "outline" },
    [PRODUCT_UNIT_STATUS.DISPOSED]: { label: t("unitStatus.disposed"), variant: "destructive" },
  }
  const s = statusLabel[unit.status] ?? { label: unit.status, variant: "secondary" }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="font-mono text-sm">{unit.serialNumber}</DialogTitle>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">{t("viewProductUnitModal.product")}</span>
            <p className="font-medium">{unit.productName}</p>
            <p className="text-xs text-muted-foreground">{unit.productSku}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('productUnit.tracking')}</span>
            <p className="font-medium">
              {unit.trackingType === TRACKING_TYPE.SERIALIZED ? TRACKING_TYPE.SERIALIZED : TRACKING_TYPE.BULK}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("viewProductUnitModal.location")}</span>
            <p className="font-medium">{unit.locationCode ?? t("viewProductUnitModal.notAssigned")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("viewProductUnitModal.importDate")}</span>
            <p className="font-medium">{fmtFull(unit.importedAt)}</p>
          </div>
          {unit.trackingType === "BULK" && (
            <div>
              <span className="text-muted-foreground">{t("viewProductUnitModal.quantity")}</span>
              <p className="font-medium">
                {unit.initialQuantity} → {unit.remainingQuantity}
              </p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">{t("viewProductUnitModal.warranty")}</span>
            {unit.warrantyMonths > 0 ? (
              <p className="font-medium">
                {t("viewProductUnitModal.warrantyMonths", { months: unit.warrantyMonths })}
                <br />
                <span className="text-xs text-muted-foreground">
                  {t("viewProductUnitModal.warrantyPeriod", { start: fmt(unit.warrantyStartDate), end: fmt(unit.warrantyExpiresAt) })}
                </span>
              </p>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("viewProductUnitModal.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
