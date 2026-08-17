import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "@/hooks/use-debounce"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Search, Plus, Eye, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useProducts } from "@/hooks/use-products"
import { useBrands } from "@/hooks/use-brands"
import { useCategories } from "@/hooks/use-categories"
import type { ProductResponse } from "@/utils/types"
import { ViewProductModal } from "../components/view-product-modal"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { TrackingTypeBadge } from "@/components/tracking-type-badge"
import { UNIT_LABELS } from "@/utils/labels"

export const ProductsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const brandFilter = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : undefined
  const categoryFilter = searchParams.get("filter") === "uncategorized"
    ? 0
    : (searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined)

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const [viewProduct, setViewProduct] = useState<ProductResponse | null>(null)

  const perm = usePermission()
  const debouncedSearch = useDebounce(searchInput, 300)

  const { data, isLoading } = useProducts(
    page,
    pageSize,
    sortStr,
    debouncedSearch || undefined,
    brandFilter,
    categoryFilter,
  )
  const brands = useBrands().data ?? []
  const categories = useCategories().data ?? []

  const hasFilters = debouncedSearch || brandFilter || categoryFilter

  const columns: Column<ProductResponse>[] = [
    {
      header: t("form.sku"),
      sortKey: "sku",
      className: "w-[110px]",
      render: (p) => <span className="font-mono text-xs">{p.sku}</span>,
    },
    { header: t("common.name"), sortKey: "name", render: (p) => <span className="font-medium">{p.name}</span> },
    {
      header: t("nav.brands"),
      className: "w-[120px]",
      render: (p) => <span className="text-muted-foreground">{p.brandName}</span>,
    },
    {
      header: t("nav.categories"),
      className: "w-[120px]",
      render: (p) => <span className="text-muted-foreground">{p.categoryName}</span>,
    },
    {
      header: t("productForm.unit"),
      className: "w-[70px]",
      render: (p) => <span>{p.unit ? t(UNIT_LABELS[p.unit] ?? p.unit) : "—"}</span>,
    },
    {
      header: t("productForm.trackingType"),
      className: "w-[110px]",
      render: (p) => <TrackingTypeBadge type={p.trackingType} />,
    },
    {
      header: t("productForm.sellPrice"),
      sortKey: "sellPrice",
      className: "w-[80px] text-right",
      render: (p) => <span className="tabular-nums">{p.sellPrice?.toLocaleString("vi-VN")}</span>,
    },
    {
      header: t("common.status"),
      className: "w-[70px] text-center",
      render: (p) => (
        <Badge variant={p.isActive ? "default" : "secondary"}>
          {p.isActive ? t("common.active") : t("common.inactive")}
        </Badge>
      ),
    },
    {
      header: t("common.actions"),
      className: "w-[100px]",
      render: (p) => (
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setViewProduct(p)}>
                <Eye className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("common.viewDetail")}</TooltipContent>
          </Tooltip>
          {perm.hasRole(...ROLES.MANAGER) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => navigate(`/products/${p.id}`)}>
                  <Pencil className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("common.edit")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("nav.products")}</h1>
        {perm.hasRole(...ROLES.MANAGER) && (
          <Button onClick={() => navigate("/products/new")}>
            <Plus className="size-4 mr-1" /> {t("productsPage.addProduct")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("productsPage.searchPlaceholder")}
            className="pl-8"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <Select
          value={brandFilter ? String(brandFilter) : "all"}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            if (v === "all") next.delete("brandId")
            else next.set("brandId", v)
            setSearchParams(next)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("productsPage.brandFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter !== undefined ? String(categoryFilter) : "all"}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            next.delete("filter")
            if (v === "all") next.delete("categoryId")
            else next.set("categoryId", v)
            setSearchParams(next)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("productsPage.categoryFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="0">{t("productsPage.uncategorized")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("")
              setSearchParams(new URLSearchParams())
              setPage(0)
            }}
          >
            {t("common.clear")}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage={hasFilters ? t("productsPage.emptySearch") : t("productsPage.empty")}
        sort={sort}
        onSort={handleSort}
        totalElements={data?.pagination.totalElements}
        page={page}
        totalPages={data?.pagination.totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s)
          setPage(0)
        }}
      />

      <ViewProductModal
        product={viewProduct}
        open={!!viewProduct}
        onOpenChange={(v) => {
          if (!v) setViewProduct(null)
        }}
      />
    </div>
  )
}
