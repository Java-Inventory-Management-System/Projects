import { create } from "zustand"
import type { LocationMapData } from "@/utils/types"

interface LocationMapState {
  data: LocationMapData | null
  setData: (data: LocationMapData | null) => void
  patchZones: (updater: (prev: LocationMapData) => LocationMapData) => void
}

export const useLocationMapStore = create<LocationMapState>((set) => ({
  data: null,

  setData: (data) => set({ data }),

  patchZones: (updater) =>
    set((state) => {
      if (!state.data) return state
      return { data: updater(state.data) }
    }),
}))
