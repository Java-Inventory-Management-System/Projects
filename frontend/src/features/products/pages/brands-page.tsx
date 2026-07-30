import { useTranslation } from "react-i18next"
import { CatalogPage } from "../components/catalog-page"
import { getBrands, createBrand, updateBrand, toggleBrandActive } from "@/services/brand-service"

export function BrandsPage() {
  const { t } = useTranslation()
  return (
    <CatalogPage
      title={t("nav.brands")}
      emptyMessage={t("brands.empty")}
      dialogTitle={t("brands.dialogTitle")}
      queryKey="brands"
      getItems={getBrands}
      createItem={createBrand}
      updateItem={updateBrand}
      toggleItem={toggleBrandActive}
    />
  )
}
