import { useMemo } from "react"
import { useImportReceipts } from "@/hooks/use-import-receipts"
import { useInventory } from "@/hooks/use-inventory"
import { Package, AlertTriangle } from "lucide-react"

export function ImportCreateSidebar() {
  const { data: recentReceiptsRes } = useImportReceipts(0, 5)
  const { data: inventoryRes } = useInventory(0, 100)

  const recentProducts = useMemo(() => {
    if (!recentReceiptsRes?.content) return []
    const seen = new Set<number>()
    const items: { productId: number; productName: string; productSku: string; receiptCode: string; quantity: number }[] = []
    for (const receipt of recentReceiptsRes.content) {
      for (const item of receipt.items) {
        if (seen.has(item.productId)) continue
        seen.add(item.productId)
        items.push({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          receiptCode: receipt.receiptCode,
          quantity: item.quantity,
        })
        if (items.length >= 5) break
      }
      if (items.length >= 5) break
    }
    return items
  }, [recentReceiptsRes])

  const lowStockItems = useMemo(() => {
    if (!inventoryRes?.content) return []
    return inventoryRes.content
      .filter((item) => item.quantity <= item.minStock)
      .slice(0, 5)
  }, [inventoryRes])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-2">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <Package className="size-3.5 text-muted-foreground" />
          Sản phẩm nhập gần đây
        </h3>
        {recentProducts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-1.5">
            {recentProducts.map((p) => (
              <div key={p.productId} className="flex items-center justify-between text-[11px]">
                <div className="truncate min-w-0 flex-1">
                  <p className="truncate font-medium">{p.productName}</p>
                  <p className="text-muted-foreground truncate">{p.productSku}</p>
                </div>
                <span className="text-[10px] shrink-0 ml-2 font-mono tabular-nums text-muted-foreground">
                  SL: {p.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-3 space-y-2">
        <h3 className="text-xs font-semibold flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertTriangle className="size-3.5" />
          Hàng sắp hết
        </h3>
        {lowStockItems.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Không có sản phẩm nào dưới mức cảnh báo</p>
        ) : (
          <div className="space-y-1.5">
            {lowStockItems.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-[11px]">
                <div className="truncate min-w-0 flex-1">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="text-muted-foreground truncate">{item.productSku}</p>
                </div>
                <span className="text-[10px] shrink-0 ml-2 font-mono tabular-nums text-destructive">
                  {item.quantity}/{item.minStock}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
