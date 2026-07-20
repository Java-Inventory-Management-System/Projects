import { CatalogPage } from "../components/catalog-page"
import { getBrands, createBrand, updateBrand, toggleBrandActive } from "@/services/brand-service"

export function BrandsPage() {
  return (
    <CatalogPage
      title="Thương hiệu"
      emptyMessage="Chưa có thương hiệu nào"
      dialogTitle="thương hiệu"
      queryKey="brands"
      getItems={getBrands}
      createItem={createBrand}
      updateItem={updateBrand}
      toggleItem={toggleBrandActive}
    />
  )
}
