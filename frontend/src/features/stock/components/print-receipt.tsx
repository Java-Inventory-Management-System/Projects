import { useTranslation } from "react-i18next"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/utils/toast"
import { getImportPrintHtml } from "@/services/import-service"
import { getExportPrintHtml } from "@/services/export-service"
import { getReturnPrintHtml } from "@/services/return-service"
import { getPurchaseOrderPrintHtml } from "@/services/purchase-order-service"
import { getStockCheckPrintHtml } from "@/services/stock-check-service"
import { getBoxPrintHtml } from "@/services/box-service"

export type PrintType = "import" | "export" | "return" | "po" | "stock-check" | "box"

const FETCHERS: Record<PrintType, (id: number, lang: string) => Promise<string>> = {
  import: getImportPrintHtml,
  export: getExportPrintHtml,
  return: getReturnPrintHtml,
  po: getPurchaseOrderPrintHtml,
  "stock-check": getStockCheckPrintHtml,
  box: getBoxPrintHtml,
}

export function PrintReceiptButton({ id, type, label }: { id: number; type: PrintType; label?: string }) {
  const { t, i18n } = useTranslation()
  const handlePrint = async () => {
    try {
      const html = await FETCHERS[type](id, i18n.language)
      const w = window.open("", "_blank")
      if (!w) return
      w.document.write(html)
      w.document.close()
    } catch {
      toast.error(t("print.printFailed"))
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
      <Printer className="size-4" />
      {label ?? t("print.print")}
    </Button>
  )
}
