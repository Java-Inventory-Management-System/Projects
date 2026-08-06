import { t } from "i18next"
import { createStockAdjustment } from "@/services/stock-adjustment-service"
import { ADJUSTMENT_TYPE, STOCK_CHECK_DIFF } from "@/utils/types"

export interface BatchItem {
  productUnitId: number
  difference: string
  serialNumber: string
  productName: string
}

export interface BatchProgress {
  current: number
  total: number
  serialNumber: string
  productName: string
}

export interface BatchResultItem {
  index: number
  serialNumber: string
  productName: string
  success: boolean
  error?: string
}

export interface BatchSnapshot {
  _v: number
  running: boolean
  progress: BatchProgress | null
  results: BatchResultItem[]
}

type Listener = () => void

let running = false
let progress: BatchProgress | null = null
let results: BatchResultItem[] = []
const listeners = new Set<Listener>()
let reason = ""
let snapVersion = 0
let cachedSnapshot: BatchSnapshot | null = null

function notify() {
  snapVersion++
  listeners.forEach((l) => l())
}

function getSnapshot(): BatchSnapshot {
  if (cachedSnapshot === null || snapVersion !== cachedSnapshot._v) {
    cachedSnapshot = { _v: snapVersion, running, progress, results: [...results] }
  }
  return cachedSnapshot
}

export const backgroundBatch = {
  start(items: BatchItem[], _reason: string) {
    if (running) return
    running = true
    results = []
    progress = null
    reason = _reason
    notify()

    ;(async () => {
      const itemsCopy = [...items]
      for (let i = 0; i < itemsCopy.length; i++) {
        const item = itemsCopy[i]
        progress = { current: i + 1, total: itemsCopy.length, serialNumber: item.serialNumber, productName: item.productName }
        notify()
        try {
          const type = item.difference === STOCK_CHECK_DIFF.UNEXPECTED ? ADJUSTMENT_TYPE.FOUND : ADJUSTMENT_TYPE.LOST
          await createStockAdjustment({ type, productUnitId: item.productUnitId, reason: reason || `Batch from stock check` })
          results.push({ index: i, serialNumber: item.serialNumber, productName: item.productName, success: true })
        } catch (err) {
          results.push({ index: i, serialNumber: item.serialNumber, productName: item.productName, success: false, error: err instanceof Error ? err.message : t("error.unknown") })
        }
        notify()
      }
      running = false
      progress = null
      notify()
    })()
  },

  subscribe(l: Listener) {
    listeners.add(l)
    return () => { listeners.delete(l) }
  },

  getSnapshot,

  isRunning() { return running },
  reset() { running = false; progress = null; results = []; notify() },
}