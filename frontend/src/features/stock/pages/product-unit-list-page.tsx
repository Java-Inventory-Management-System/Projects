import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "@/hooks/use-debounce"
import { getProductUnits } from "@/services/product-unit-service"
import { getProducts } from "@/services/product-service"
import { PRODUCT_UNIT_STATUS, type ProductUnit } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Eye, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DataTable, type Column } from "@/components/ui/data-table"
import { ViewProductUnitModal } from "../components/view-product-unit-modal"
import { LocationCodePopover } from "../components/location-code-popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

const getStatusOptions = (t: (key: string) => string) => [
  { value: "all", label: t("productUnitList.all") },
  { value: PRODUCT_UNIT_STATUS.IN_STOCK, label: t("unitStatus.inStock") },
  { value: PRODUCT_UNIT_STATUS.SOLD, label: t("unitStatus.sold") },
  { value: PRODUCT_UNIT_STATUS.DEFECTIVE, label: t("unitStatus.defective") },
  { value: PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE, label: t("unitStatus.damagedInStorage") },
  { value: PRODUCT_UNIT_STATUS.LOST, label: t("unitStatus.lost") },
  { value: PRODUCT_UNIT_STATUS.UNDER_REPAIR, label: t("unitStatus.underRepair") },
  { value: PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER, label: t("unitStatus.sentToManufacturer") },
  { value: PRODUCT_UNIT_STATUS.RETURNED, label: t("unitStatus.returned") },
  { value: PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER, label: t("unitStatus.returnedToSupplier") },
  { value: PRODUCT_UNIT_STATUS.DISPOSED, label: t("unitStatus.disposed") },
  { value: PRODUCT_UNIT_STATUS.QUARANTINED, label: t("unitStatus.quarantined") },
]

const statusBadge: Record<string, { labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  [PRODUCT_UNIT_STATUS.IN_STOCK]: { labelKey: "unitStatus.inStock", variant: "default" },
  [PRODUCT_UNIT_STATUS.SOLD]: { labelKey: "unitStatus.sold", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.DEFECTIVE]: { labelKey: "unitStatus.defective", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: { labelKey: "unitStatus.damagedInStorage", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.LOST]: { labelKey: "unitStatus.lost", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.UNDER_REPAIR]: { labelKey: "unitStatus.underRepair", variant: "outline" },
  [PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER]: { labelKey: "unitStatus.sentToManufacturer", variant: "outline" },
  [PRODUCT_UNIT_STATUS.RETURNED]: { labelKey: "unitStatus.returned", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER]: { labelKey: "unitStatus.returnedToSupplier", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.DISPOSED]: { labelKey: "unitStatus.disposed", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.QUARANTINED]: { labelKey: "unitStatus.quarantined", variant: "outline" },
}

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("vi-VN")
}

export const ProductUnitListPage = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const statusFilter = searchParams.get("status") ?? "all"
  const productFilter = searchParams.get("product") ?? "all"
  const sortOrder = searchParams.get("sort") ?? "desc"
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const [viewUnit, setViewUnit] = useState<ProductUnit | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, val] of Object.entries(updates)) {
          if (val) next.set(key, val)
          else next.delete(key)
        }
        return next
      }, { replace: true })
    },
    [setSearchParams],
  )

  const { data: products } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => getProducts(0, 500).then((r) => r.content),
    staleTime: 5 * 60 * 1000,
  })

  const hasFilters = debouncedSearch || statusFilter !== "all" || productFilter !== "all"
  const sortStr = `importedAt,${sortOrder}`

  const { data: unitsRes, isLoading, error: fetchError } = useQuery({
    queryKey: ["product-units", hasFilters ? "all" : page, pageSize, sortStr, statusFilter, productFilter, debouncedSearch || ""],
    queryFn: () => (hasFilters ? getProductUnits(0, 10000, sortStr) : getProductUnits(page, pageSize, sortStr)),
  })

  const filtered = (unitsRes?.content ?? []).filter((u) => {
    if (debouncedSearch && !u.serialNumber.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    if (statusFilter !== "all" && u.status !== statusFilter) return false
    if (productFilter !== "all" && u.productId !== Number(productFilter)) return false
    return true
  })

  const columns: Column<ProductUnit>[] = [
    {
      header: t("table.serial"),
      sortKey: "serialNumber",
      render: (u) => <span className="font-mono text-xs">{u.serialNumber}</span>,
    },
    {
      header: t("table.product"),
      render: (u) => (
        <>
          <span className="font-medium">{u.productName}</span>
          <span className="text-xs text-muted-foreground ml-2">{u.productSku}</span>
        </>
      ),
    },
    {
      header: t("table.status"),
      render: (u) => {
        const s = statusBadge[u.status]
        return <Badge variant={s?.variant ?? "secondary"}>{s ? t(s.labelKey) : u.status}</Badge>
      },
    },
    { header: t("table.location"), render: (u) => <LocationCodePopover code={u.locationCode} /> },
    {
      header: t("table.importDate"),
      sortKey: "importedAt",
      render: (u) => <span className="text-muted-foreground text-xs">{fmt(u.importedAt)}</span>,
    },
    {
      header: t("table.warranty"),
      render: (u) => <span className="text-muted-foreground text-xs">{fmt(u.warrantyExpiresAt)}</span>,
    },
    {
      header: t("table.actions"),
      className: "w-[80px]",
      render: (u) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setViewUnit(u)
                setViewOpen(true)
              }}
            >
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("common.viewDetail")}</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t("productUnitList.title")}</h1>

      <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={t("productUnitList.searchPlaceholder")}
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                updateParams({ page: undefined })
              }}
            />
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              {filterOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {t("productUnitList.filter")}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(v) => updateParams({ status: v || undefined, page: undefined })}
            >
              {getStatusOptions(t).slice(0, 5).map((o) => (
                <ToggleGroupItem key={o.value} value={o.value} size="sm" className="text-xs">
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select
              value={productFilter}
              onValueChange={(v) => updateParams({ product: v === "all" ? undefined : v, page: undefined })}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder={t("productUnitList.product")} />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {(products ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(v) => updateParams({ sort: v === "desc" ? undefined : v, page: undefined })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t("productUnitList.sort")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">{t("productUnitList.newest")}</SelectItem>
                <SelectItem value="asc">{t("productUnitList.oldest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {fetchError ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-destructive mb-2">{fetchError instanceof Error ? fetchError.message : t("productUnitList.loadError")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("")
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                for (const key of ["page", "status", "product", "sort"]) next.delete(key)
                return next
              }, { replace: true })
            }}
          >
            <RefreshCw className="size-3 mr-1" /> {t("productUnitList.retry")}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={hasFilters ? t("productUnitList.emptySearch") : t("productUnitList.empty")}
          sort={sort}
          onSort={handleSort}
          totalElements={unitsRes?.pagination?.totalElements}
          page={!hasFilters ? page : undefined}
          totalPages={!hasFilters ? unitsRes?.pagination?.totalPages : undefined}
          pageSize={!hasFilters ? pageSize : undefined}
          onPageChange={!hasFilters ? (p) => updateParams({ page: String(p) }) : undefined}
          onPageSizeChange={!hasFilters
            ? (s) => {
                setPageSize(s)
                updateParams({ page: undefined })
              }
            : undefined}
        />
      )}

      <ViewProductUnitModal unit={viewUnit} open={viewOpen} onOpenChange={setViewOpen} />
    </div>
  )
}
