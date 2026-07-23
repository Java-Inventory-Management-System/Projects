import { PRODUCT_UNIT_STATUS, TRACKING_TYPE, type ProductUnit } from "@/utils/types"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  [PRODUCT_UNIT_STATUS.IN_STOCK]: { label: "Trong kho", variant: "default" },
  [PRODUCT_UNIT_STATUS.SOLD]: { label: "Đã bán", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.DEFECTIVE]: { label: "Lỗi", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: { label: "Hư trong kho", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.LOST]: { label: "Mất", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.UNDER_REPAIR]: { label: "Đang sửa", variant: "outline" },
  [PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER]: { label: "Gửi NSX", variant: "outline" },
  [PRODUCT_UNIT_STATUS.RETURNED]: { label: "Trả lại", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER]: { label: "Trả NCC", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.REMOVED]: { label: "Đã xóa", variant: "outline" },
  [PRODUCT_UNIT_STATUS.DISPOSED]: { label: "Hủy", variant: "destructive" },
}

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
            <span className="text-muted-foreground">Sản phẩm</span>
            <p className="font-medium">{unit.productName}</p>
            <p className="text-xs text-muted-foreground">{unit.productSku}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tracking</span>
            <p className="font-medium">
              {unit.trackingType === TRACKING_TYPE.SERIALIZED ? TRACKING_TYPE.SERIALIZED : TRACKING_TYPE.BULK}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Vị trí</span>
            <p className="font-medium">{unit.locationCode ?? "Chưa gán"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Ngày nhập</span>
            <p className="font-medium">{fmtFull(unit.importedAt)}</p>
          </div>
          {unit.trackingType === "BULK" && (
            <div>
              <span className="text-muted-foreground">Số lượng</span>
              <p className="font-medium">
                {unit.initialQuantity} → {unit.remainingQuantity}
              </p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Bảo hành</span>
            {unit.warrantyMonths > 0 ? (
              <p className="font-medium">
                {unit.warrantyMonths} tháng
                <br />
                <span className="text-xs text-muted-foreground">
                  BĐ: {fmt(unit.warrantyStartDate)} — Hết: {fmt(unit.warrantyExpiresAt)}
                </span>
              </p>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
