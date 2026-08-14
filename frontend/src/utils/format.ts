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

export function formatRelativeTime(value: string): string {
  const d = new Date(value)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  const hm = d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })
  if (t >= startToday) return `${i18n.t("common.today")}, ${hm}`
  if (t >= startToday - 86_400_000) return `${i18n.t("common.yesterday")}, ${hm}`
  return formatDateVN(d)
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
