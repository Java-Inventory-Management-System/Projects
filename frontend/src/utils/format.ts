import i18n from "@/i18n"

const locale = () => (i18n.language === "en" ? "en-US" : "vi-VN")

export function formatCompactVND(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + "B"
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M"
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K"
  return value.toLocaleString(locale())
}

export function formatDateVN(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString(locale())}₫`
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(locale())
}

const pad = (n: number) => String(n).padStart(2, "0")

export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function localDayStartUtc(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toISOString()
}

export function localDayEndUtc(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}
