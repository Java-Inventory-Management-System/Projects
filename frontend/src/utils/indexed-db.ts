import { openDB } from "idb"
import type { StockCheckItem } from "@/utils/types"

const DB_NAME = "warehouse-drafts"
const STORE_NAME = "stock-check"
const DB_VERSION = 1

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME)
    }
  },
})

export async function saveDraft(id: string, items: StockCheckItem[]): Promise<void> {
  const db = await dbPromise
  await db.put(STORE_NAME, { items, updatedAt: new Date().toISOString() }, id)
}

export async function loadDraft(id: string): Promise<{ items: StockCheckItem[]; updatedAt: string } | undefined> {
  const db = await dbPromise
  return db.get(STORE_NAME, id)
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete(STORE_NAME, id)
}