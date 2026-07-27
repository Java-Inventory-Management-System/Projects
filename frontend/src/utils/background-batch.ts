import { createStockAdjustment } from "@/services/stock-adjustment-service"

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

type Listener = () => void

let running = false
let progress: BatchProgress | null = null
let results: BatchResultItem[] = []
let listeners = new Set<Listener>()
let reason = ""

function notify() {
  listeners.forEach((l) => l())
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
          const type = item.difference === "UNEXPECTED" ? "FOUND" : "LOST"
          await createStockAdjustment({ type, productUnitId: item.productUnitId, reason: reason || `Batch from stock check` })
          results.push({ index: i, serialNumber: item.serialNumber, productName: item.productName, success: true })
        } catch (err) {
          results.push({ index: i, serialNumber: item.serialNumber, productName: item.productName, success: false, error: err instanceof Error ? err.message : "Lỗi không xác định" })
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

  getProgress() { return progress },
  getResults() { return [...results] },
  isRunning() { return running },
  reset() { running = false; progress = null; results = []; notify() },
}