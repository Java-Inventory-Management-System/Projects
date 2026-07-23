import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReceiptData {
  code: string
  type: "import" | "export"
  status: string
  createdAt: string
  createdByName: string
  approvedByName: string | null
  note: string | null
  totalAmount: number
  items: Array<{
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
  }>
}

function renderReceiptHtml(r: ReceiptData): string {
  const title = r.type === "import" ? "PHIẾU NHẬP KHO" : "PHIẾU XUẤT KHO"
  const rows = r.items
    .map(
      (item, i) =>
        `<tr>
          <td class="num">${i + 1}</td>
          <td>${item.productName}<br/><span class="sku">${item.productSku}</span></td>
          <td class="num">${item.quantity}</td>
          <td class="num">${item.unitPrice.toLocaleString("vi-VN")}</td>
          <td class="num">${(item.quantity * item.unitPrice).toLocaleString("vi-VN")}</td>
        </tr>`,
    )
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${r.code}</title>
  <style>
    @page { margin: 15mm }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000 }
    h1 { text-align: center; font-size: 18px; margin-bottom: 4px }
    .meta { margin-bottom: 16px }
    .meta td { padding: 2px 8px; vertical-align: top }
    .meta td:first-child { width: 80px; color: #555 }
    table { width: 100%; border-collapse: collapse }
    th { border-top: 2px solid #000; border-bottom: 1px solid #000; padding: 6px 4px; text-align: left; font-size: 11px }
    td { padding: 4px }
    td.num, th.num { text-align: right }
    .total { text-align: right; font-weight: bold; font-size: 14px; margin-top: 12px }
    .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #888 }
    .note { border-top: 1px solid #ccc; margin-top: 12px; padding-top: 8px }
    .sku { font-size: 10px; color: #666 }
    tr:nth-child(even) td { background: #f5f5f5 }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p style="text-align:center;font-size:14px;font-weight:bold">${r.code}</p>
  <table class="meta">
    <tr><td>Ngày</td><td>${new Date(r.createdAt).toLocaleString("vi-VN")}</td></tr>
    <tr><td>Người tạo</td><td>${r.createdByName}</td></tr>
    ${r.approvedByName ? `<tr><td>Người duyệt</td><td>${r.approvedByName}</td></tr>` : ""}
  </table>
  <table>
    <thead><tr>
      <th class="num" style="width:32px">#</th>
      <th>Sản phẩm</th>
      <th class="num">SL</th>
      <th class="num">Đơn giá</th>
      <th class="num">Thành tiền</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Tổng: ${r.totalAmount.toLocaleString("vi-VN")}₫</div>
  ${r.note ? `<div class="note"><strong>Ghi chú:</strong> ${r.note}</div>` : ""}
  <div class="footer">Phiếu được tạo từ hệ thống quản lý kho &mdash; ${new Date().toLocaleString("vi-VN")}</div>
  <script>window.onload = function() { window.print() } <\/script>
</body>
</html>`
}

export function PrintReceiptButton({ receipt, type }: { receipt: ReceiptData; type: "import" | "export" }) {
  const handlePrint = () => {
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(renderReceiptHtml({ ...receipt, type }))
    w.document.close()
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
      <Printer className="size-4" />
      In phiếu
    </Button>
  )
}
