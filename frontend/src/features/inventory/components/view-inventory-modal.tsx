import type { InventoryItem } from "@/utils/types"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, MapPin } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ViewInventoryModal({ item, open, onOpenChange }: { item: InventoryItem | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!item) return null
  const low = item.quantity <= item.minStock
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.productName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">SKU:</span>
              <p className="font-mono text-xs">{item.productSku}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Mã SP:</span>
              <p className="font-medium">#{item.productId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Số lượng:</span>
              <p className={`font-semibold tabular-nums ${low ? "text-red-600" : ""}`}>
                {item.quantity.toLocaleString("vi-VN")}
                {low && <AlertTriangle className="inline size-4 ml-1 text-red-500" />}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Tồn tối thiểu:</span>
              <p className="tabular-nums">{item.minStock.toLocaleString("vi-VN")}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Vị trí:</span>
              <p className="inline-flex items-center gap-1 font-medium">
                <MapPin className="size-3" />
                {item.location}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Trạng thái:</span>
              <div className="mt-1">
                {low ? (
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" />Low Stock</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-300">In Stock</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Cập nhật lần cuối: {new Date(item.updatedAt).toLocaleString("vi-VN")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
