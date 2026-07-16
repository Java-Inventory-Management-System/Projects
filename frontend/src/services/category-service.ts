import http from "@/utils/http-client"
import type { CategoryResponse } from "@/utils/types"
import { mapResponsePage, mapCategory } from "@/utils/mappers"

export async function getCategories(): Promise<CategoryResponse[]> {
  const res = await http.get("/category", { params: { size: 200 } })
  return mapResponsePage(res, mapCategory).content
}
