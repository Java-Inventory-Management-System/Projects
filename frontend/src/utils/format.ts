export function formatCompactVND(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + "B"
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M"
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K"
  return value.toLocaleString("vi-VN")
}

export function formatDateVN(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}
