import type { ProductResponse } from "@/utils/types"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export const ViewProductModal = ({
  product,
  open,
  onOpenChange,
}: {
  product: ProductResponse | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) => {
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
              <span className="text-muted-foreground">SKU:</span>
              <p className="font-mono text-xs">{product.sku ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Barcode:</span>
              <p className="font-mono text-xs">{product.barcode ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Thương hiệu:</span>
              <p className="font-medium">{product.brandName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Danh mục:</span>
              <p className="font-medium">{product.categoryName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Đơn vị:</span>
              <p>{product.unit ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tracking:</span>
              <p>{product.trackingType ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Giá bán:</span>
              <p className="tabular-nums font-semibold">
                {product.sellPrice ? `${product.sellPrice.toLocaleString("vi-VN")}₫` : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Tồn tối thiểu:</span>
              <p className="tabular-nums">{product.minStock?.toLocaleString("vi-VN") ?? "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Trạng thái:</span>
              <div className="mt-1">
                <Badge variant={product.isActive ? "default" : "secondary"}>
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
          {product.description && (
            <div>
              <span className="text-muted-foreground">Mô tả:</span>
              <p className="mt-0.5 text-muted-foreground">{product.description}</p>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Tạo: {new Date(product.createdAt).toLocaleString("vi-VN")} &middot; Cập nhật:{" "}
            {new Date(product.updatedAt).toLocaleString("vi-VN")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
