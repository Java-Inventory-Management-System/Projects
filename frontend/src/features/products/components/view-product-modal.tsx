import { useTranslation } from "react-i18next"
import type { ProductResponse } from "@/utils/types"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrackingTypeBadge, UNIT_LABELS } from "@/components/tracking-type-badge"

export const ViewProductModal = ({
  product,
  open,
  onOpenChange,
}: {
  product: ProductResponse | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) => {
  const { t } = useTranslation()
  if (!product) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,42rem)]">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">{t("productView.sku")}</span>
              <p className="font-mono text-xs">{product.sku ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("productView.barcode")}</span>
              <p className="font-mono text-xs">{product.barcode ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("productView.brand")}</span>
              <p className="font-medium">{product.brandName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("productView.category")}</span>
              <p className="font-medium">{product.categoryName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("productView.unit")}</span>
              <p>{t(UNIT_LABELS[product.unit] ?? product.unit)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("productView.tracking")}</span>
              <TrackingTypeBadge type={product.trackingType} />
            </div>
            <div>
              <span className="text-muted-foreground">{t("productView.sellPrice")}</span>
              <p className="tabular-nums font-semibold">
                {product.sellPrice ? `${product.sellPrice.toLocaleString("vi-VN")}₫` : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("productView.minStock")}</span>
              <p className="tabular-nums">{product.minStock?.toLocaleString("vi-VN") ?? "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">{t("productView.status")}</span>
              <div className="mt-1">
                <Badge variant={product.isActive ? "default" : "secondary"}>
                  {product.isActive ? t("common.active") : t("common.inactive")}
                </Badge>
              </div>
            </div>
          </div>
          {product.description && (
            <div>
              <span className="text-muted-foreground">{t("productView.description")}</span>
              <p className="mt-0.5 text-muted-foreground">{product.description}</p>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {t("productView.created")} {new Date(product.createdAt).toLocaleString("vi-VN")} &middot; {t("productView.updated")}{" "}
            {new Date(product.updatedAt).toLocaleString("vi-VN")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
