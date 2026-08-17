export interface DiffRow {
  key: string
  label: string
  oldDisplay?: string
  newDisplay?: string
  kind: "changed" | "added" | "removed"
}

export interface DiffResult {
  rows: DiffRow[]
  truncated: number
}

const ACRONYM_LABELS: Record<string, string> = { SKU: "SKU", IP: "IP", ID: "ID", IDS: "IDs", URL: "URL" }

export function humanizeFieldName(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/Ids$/i, "IDs")
  return spaced
    .split(" ")
    .map((w) => ACRONYM_LABELS[w.toUpperCase()] ?? w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

const SENSITIVE_SUBSTRINGS = ["password", "token", "secret"]

export const DEFAULT_AUDIT_EXCLUDE = ["id", "status"]

const PRIORITY_FIELDS = ["status"]

const MAX_DIFF_FIELDS = 8

export function isExcludedField(field: string, extra: string[] = []): boolean {
  const lower = field.toLowerCase()
  if (DEFAULT_AUDIT_EXCLUDE.includes(lower)) return true
  if (SENSITIVE_SUBSTRINGS.some((s) => lower.includes(s))) return true
  if (lower.endsWith("code") || lower.endsWith("at")) return true
  return extra.includes(field)
}

function parseJson(s: string | null): Record<string, unknown> | null {
  if (!s) return null
  try {
    const v = JSON.parse(s)
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function isSame(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function isDateLike(key: string) {
  const lower = key.toLowerCase()
  return lower.endsWith("at") || lower.endsWith("date") || lower.endsWith("time")
}

function formatValue(key: string, v: unknown): string {
  if (v === null || v === undefined) return ""
  if (Array.isArray(v)) return v.length === 0 ? "" : `${v.length} mục`
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>
    for (const f of ["name", "code", "title"]) {
      const val = obj[f]
      if (typeof val === "string" && val.length > 0) return val
    }
    const str = JSON.stringify(v)
    return str.length > 70 ? str.slice(0, 67) + "..." : str
  }
  if (isDateLike(key) && typeof v === "string") {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toLocaleString("vi-VN")
  }
  return String(v)
}

function stripOldNewPrefix(key: string): string {
  return key.replace(/^(old|new)(?=[A-Z])/, "")
}

export function computeDiffRows(
  oldValue: string | null,
  newValue: string | null,
  extraExclude: string[] = [],
  limit: number = MAX_DIFF_FIELDS,
): DiffResult {
  const oldObj = parseJson(oldValue)
  const newObj = parseJson(newValue)
  if (!oldObj && !newObj) return { rows: [], truncated: 0 }

  const keys = Array.from(new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})]))
    .filter((k) => !isExcludedField(k, extraExclude))
    .sort((a, b) => PRIORITY_FIELDS.indexOf(b) - PRIORITY_FIELDS.indexOf(a))

  const pairBases = new Map<string, { oldKey?: string; newKey?: string }>()
  for (const k of keys) {
    const base = stripOldNewPrefix(k)
    if (base !== k) {
      const pair = pairBases.get(base) ?? {}
      if (k.startsWith("old")) pair.oldKey = k
      else pair.newKey = k
      pairBases.set(base, pair)
    }
  }

  const rows: DiffRow[] = []
  const consumed = new Set<string>()
  for (const key of keys) {
    if (consumed.has(key)) continue
    const base = stripOldNewPrefix(key)
    const pair = base !== key ? pairBases.get(base) : undefined
    const canMerge =
      !!pair &&
      !!pair.oldKey &&
      !!pair.newKey &&
      !keys.some((k) => k.toLowerCase() === base.toLowerCase())
    if (canMerge && key === pair!.oldKey) {
      const oldV = oldObj?.[pair!.oldKey!] ?? newObj?.[pair!.oldKey!]
      const newV = newObj?.[pair!.newKey!] ?? oldObj?.[pair!.newKey!]
      if (oldV !== null && oldV !== undefined && newV !== null && newV !== undefined) {
        consumed.add(pair!.oldKey!).add(pair!.newKey!)
        rows.push({
          key: base,
          label: humanizeFieldName(base),
          oldDisplay: formatValue(pair!.oldKey!, oldV),
          newDisplay: formatValue(pair!.newKey!, newV),
          kind: "changed",
        })
        continue
      }
    }
    const oldV = oldObj?.[key]
    const newV = newObj?.[key]
    const oldDisplay = formatValue(key, oldV)
    const newDisplay = formatValue(key, newV)
    const oldEmpty = oldV === null || oldV === undefined || oldDisplay === ""
    const newEmpty = newV === null || newV === undefined || newDisplay === ""
    if (oldEmpty && newEmpty) continue
    if (!oldEmpty && !newEmpty && isSame(oldV, newV)) continue

    const label = humanizeFieldName(key)
    if (oldEmpty) rows.push({ key, label, newDisplay, kind: "added" })
    else if (newEmpty) rows.push({ key, label, oldDisplay, kind: "removed" })
    else rows.push({ key, label, oldDisplay, newDisplay, kind: "changed" })
  }
  return { rows: rows.slice(0, limit), truncated: Math.max(0, rows.length - limit) }
}
