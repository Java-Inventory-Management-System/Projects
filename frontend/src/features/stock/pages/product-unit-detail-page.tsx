import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getProductUnitById } from "@/services/product-unit-service"
import { PRODUCT_UNIT_STATUS, TRACKING_TYPE } from "@/utils/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { TrackingTypeBadge } from "@/components/tracking-type-badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { LocationCodePopover } from "../components/location-code-popover"
import { UnitHistoryPanel } from "../components/unit-history-panel"
import { PriceHistoryPanel } from "../components/price-history-panel"

function fmt(d: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("vi-VN")
}

function fmtFull(d: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleString("vi-VN")
}

const statusLabel: Record<string, { labelKey: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  [PRODUCT_UNIT_STATUS.IN_STOCK]: { labelKey: "unitStatus.inStock", variant: "default" },
  [PRODUCT_UNIT_STATUS.SOLD]: { labelKey: "unitStatus.sold", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.DEFECTIVE]: { labelKey: "unitStatus.defective", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: { labelKey: "unitStatus.damagedInStorage", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.LOST]: { labelKey: "unitStatus.lost", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.UNDER_REPAIR]: { labelKey: "unitStatus.underRepair", variant: "outline" },
  [PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER]: { labelKey: "unitStatus.sentToManufacturer", variant: "outline" },
  [PRODUCT_UNIT_STATUS.RETURNED]: { labelKey: "unitStatus.returned", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER]: { labelKey: "unitStatus.returnedToSupplier", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.REMOVED]: { labelKey: "unitStatus.removed", variant: "outline" },
  [PRODUCT_UNIT_STATUS.DISPOSED]: { labelKey: "unitStatus.disposed", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.RETURN_QC_HOLD]: { labelKey: "unitStatus.returnQcHold", variant: "outline" },
  [PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT]: { labelKey: "unitStatus.waitingRmaExport", variant: "outline" },
  [PRODUCT_UNIT_STATUS.RMA_REPAIRED_RETURNED]: { labelKey: "unitStatus.rmaRepairedReturned", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.RMA_UNREPAIRABLE]: { labelKey: "unitStatus.rmaUnrepairable", variant: "destructive" },
  [PRODUCT_UNIT_STATUS.REJECTED_RETURN]: { labelKey: "unitStatus.rejectedReturn", variant: "secondary" },
  [PRODUCT_UNIT_STATUS.PENDING_DISPOSAL]: { labelKey: "unitStatus.pendingDisposal", variant: "destructive" },
}

export function ProductUnitDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { data: unit, isLoading, isError } = useQuery({
    queryKey: ["product-unit", id],
    queryFn: () => getProductUnitById(Number(id)),
    enabled: !!id,
    retry: false,
  })

  if (isLoading)
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )

  if (isError || !unit)
    return (
      <Empty>
        <EmptyTitle>{t("unitDetail.notFound")}</EmptyTitle>
        <EmptyDescription>{t("unitDetail.notFoundDesc")}</EmptyDescription>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/stock/units?tab=list")}>
          {t("unitDetail.backToList")}
        </Button>
      </Empty>
    )

  const s = statusLabel[unit.status] ?? { labelKey: null as string | null, variant: "secondary" as const }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/units?tab=list")}>{t("unitDetail.breadcrumb")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{unit.serialNumber || unit.productSku}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight font-mono">{unit.serialNumber || unit.productSku}</h1>
          <Badge variant={s.variant}>{s.labelKey ? t(s.labelKey) : unit.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 items-start lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("viewProductUnitModal.product")}</span>
                  <p className="font-medium">
                    {unit.productName}{" "}
                    {unit.productSku && <span className="text-muted-foreground">({unit.productSku})</span>}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("productUnit.tracking")}</span>
                  <p className="font-medium">
                    <TrackingTypeBadge type={unit.trackingType} />
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("viewProductUnitModal.location")}</span>
                  {unit.locationCode ? (
                    <LocationCodePopover code={unit.locationCode} />
                  ) : (
                    <p className="text-muted-foreground">{t("viewProductUnitModal.notAssigned")}</p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("viewProductUnitModal.importDate")}</span>
                  <p className="font-medium">{fmtFull(unit.importedAt)}</p>
                </div>
                {unit.trackingType === TRACKING_TYPE.BULK && (
                  <div>
                    <span className="text-muted-foreground">{t("viewProductUnitModal.quantity")}</span>
                    <p className="font-medium">
                      {unit.initialQuantity} → {unit.remainingQuantity}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t("viewProductUnitModal.warranty")}</span>
                  {unit.warrantyMonths > 0 ? (
                    <p className="font-medium">
                      {t("viewProductUnitModal.warrantyMonths", { months: unit.warrantyMonths })}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {t("viewProductUnitModal.warrantyPeriod", { start: fmt(unit.warrantyStartDate), end: fmt(unit.warrantyExpiresAt) })}
                      </span>
                    </p>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 space-y-4">
          <UnitHistoryPanel unit={unit} />
          <PriceHistoryPanel productId={unit.productId} productName={unit.productName} />
        </aside>
      </div>
    </div>
  )
}
