import { useTranslation } from "react-i18next"
import { CatalogPage } from "../components/catalog-page"
import { getCategories, createCategory, updateCategory, toggleCategoryActive } from "@/services/category-service"

export function CategoriesPage() {
  const { t } = useTranslation()
  return (
    <CatalogPage
      title={t("nav.categories")}
      emptyMessage={t("categories.empty")}
      dialogTitle={t("categories.dialogTitle")}
      queryKey="categories"
      getItems={getCategories}
      createItem={createCategory}
      updateItem={updateCategory}
      toggleItem={toggleCategoryActive}
      deactivateWarning
    />
  )
}
