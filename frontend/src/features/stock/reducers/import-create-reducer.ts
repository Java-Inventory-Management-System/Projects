import type { LineItem } from "@/utils/types"

export type ItemAction =
  | { type: "ADD_ITEMS"; payload: LineItem[] }
  | { type: "SET_ITEMS"; payload: LineItem[] }
  | { type: "UPDATE_ITEM"; tempId: number; field: keyof LineItem; value: string | number }
  | { type: "REMOVE_ITEM"; tempId: number }
  | { type: "SAVE_SERIALS"; tempId: number; serials: string[] }
  | { type: "PASTE_SERIALS"; pasteText: string }

export function itemReducer(state: LineItem[], action: ItemAction): LineItem[] {
  switch (action.type) {
    case "ADD_ITEMS":
      return [...state, ...action.payload]
    case "SET_ITEMS":
      return action.payload
    case "UPDATE_ITEM":
      return state.map((i) => (i.tempId === action.tempId ? { ...i, [action.field]: action.value } : i))
    case "REMOVE_ITEM":
      return state.filter((i) => i.tempId !== action.tempId)
    case "SAVE_SERIALS":
      return state.map((i) => (i.tempId === action.tempId ? { ...i, serials: action.serials } : i))
    case "PASTE_SERIALS": {
      const lines = action.pasteText.split("\n").filter(Boolean)
      return state.map((item) => {
        const line = lines.find((l) => l.trim().toLowerCase().startsWith(item.productSku.toLowerCase()))
        if (!line) return item
        const colonIdx = line.indexOf(":")
        if (colonIdx === -1) return item
        const serials = line
          .slice(colonIdx + 1)
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
        return serials.length ? { ...item, serials } : item
      })
    }
  }
}
