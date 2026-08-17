import http from "@/utils/http-client"
import type { DefectCategory } from "@/utils/types"

export async function getDefectCategories(): Promise<DefectCategory[]> {
  return (await http.get("/defect-categories")) as unknown as DefectCategory[]
}

export interface DefectCategoryPayload {
  code?: string
  name?: string
  description?: string | null
  isRepairable?: boolean
  isReplaceable?: boolean
}

export async function createDefectCategory(data: DefectCategoryPayload): Promise<DefectCategory> {
  return (await http.post("/defect-categories", data)) as unknown as DefectCategory
}

export async function updateDefectCategory(id: number, data: DefectCategoryPayload): Promise<DefectCategory> {
  return (await http.put(`/defect-categories/${id}`, data)) as unknown as DefectCategory
}

export async function toggleDefectCategoryActive(id: number): Promise<void> {
  await http.put(`/defect-categories/${id}/toggle-active`)
}