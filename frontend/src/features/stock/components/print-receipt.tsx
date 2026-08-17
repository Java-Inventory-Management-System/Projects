import { useTranslation } from "react-i18next"
import { Printer, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/utils/toast"
import { getImportPrintFile } from "@/services/import-service"
import { getExportPrintFile } from "@/services/export-service"
import { getReturnPrintFile } from "@/services/return-service"
import { getPurchaseOrderPrintFile } from "@/services/purchase-order-service"
import { getStockCheckPrintFile } from "@/services/stock-check-service"
import { getBoxPrintFile } from "@/services/box-service"

export type PrintType = "import" | "export" | "return" | "po" | "stock-check" | "box"

type Fetch = (id: number, lang: string, format: "pdf" | "excel") => Promise<Blob>

const FETCHERS: Record<PrintType, Fetch> = {
  import: getImportPrintFile,
  export: getExportPrintFile,
  return: getReturnPrintFile,
  po: getPurchaseOrderPrintFile,
  "stock-check": getStockCheckPrintFile,
  box: getBoxPrintFile,
}

export function PrintReceiptButton({ id, type, label }: { id: number; type: PrintType; label?: string }) {
  const { t, i18n } = useTranslation()

  const handle = async (format: "pdf" | "excel") => {
    try {
      const blob = await FETCHERS[type](id, i18n.language, format)
      const url = URL.createObjectURL(blob)
      if (format === "pdf") {
        window.open(url, "_blank")
      } else {
        const a = document.createElement("a")
        a.href = url
        a.download = `receipt-${id}.xlsx`
        a.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error(t("print.printFailed"))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Printer className="size-4" />
          {label ?? t("print.print")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handle("pdf")}>
          <Printer className="size-3.5" /> {t("print.printPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle("excel")}>
          <FileDown className="size-3.5" /> {t("print.excel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}