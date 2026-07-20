import { CatalogPage } from "../components/catalog-page"
import { getCategories, createCategory, updateCategory, toggleCategoryActive } from "@/services/category-service"

export function CategoriesPage() {
  return (
    <CatalogPage
      title="Danh mục"
      emptyMessage="Chưa có danh mục nào"
      dialogTitle="danh mục"
      queryKey="categories"
      getItems={getCategories}
      createItem={createCategory}
      updateItem={updateCategory}
      toggleItem={toggleCategoryActive}
    />
  )
}
