import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { lookupWarranty } from "@/services/warranty-service"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, ShieldCheck, AlertTriangle, XCircle, Check } from "lucide-react"
import { PRODUCT_UNIT_STATUS } from "@/utils/types"

interface SerialSearchPickerProps {
  productName?: string
  productId?: number
  excludeUnitId?: number
  value: number | null
  onChange: (unitId: number | null) => void
  disabled?: boolean
}

export const SerialSearchPicker = ({
  productName,
  productId,
  excludeUnitId,
  value,
  onChange,
  disabled,
}: SerialSearchPickerProps) => {
  const { t } = useTranslation()
  const statusLabel: Record<string, string> = {
    [PRODUCT_UNIT_STATUS.IN_STOCK]: t("unitStatus.inStock"),
    [PRODUCT_UNIT_STATUS.SOLD]: t("unitStatus.sold"),
    [PRODUCT_UNIT_STATUS.RESERVED]: t("unitStatus.reserved"),
    [PRODUCT_UNIT_STATUS.QUARANTINED]: t("unitStatus.quarantined"),
    [PRODUCT_UNIT_STATUS.RETURNED]: t("unitStatus.returned"),
    [PRODUCT_UNIT_STATUS.DISPOSED]: t("unitStatus.disposed"),
    [PRODUCT_UNIT_STATUS.WARRANTY]: t("unitStatus.warranty"),
    [PRODUCT_UNIT_STATUS.WARRANTY_DONE]: t("unitStatus.warrantyDone"),
    [PRODUCT_UNIT_STATUS.WARRANTY_REPLACED]: t("unitStatus.warrantyReplaced"),
    [PRODUCT_UNIT_STATUS.DEFECTIVE]: t("unitStatus.defective"),
    [PRODUCT_UNIT_STATUS.DAMAGED_IN_STORAGE]: t("unitStatus.damagedInStorage"),
    [PRODUCT_UNIT_STATUS.LOST]: t("unitStatus.lost"),
    [PRODUCT_UNIT_STATUS.UNDER_REPAIR]: t("unitStatus.underRepair"),
    [PRODUCT_UNIT_STATUS.SENT_TO_MANUFACTURER]: t("unitStatus.sentToManufacturer"),
    [PRODUCT_UNIT_STATUS.RETURNED_TO_SUPPLIER]: t("unitStatus.returnedToSupplier"),
    [PRODUCT_UNIT_STATUS.REMOVED]: t("unitStatus.removed"),
  }
  const [searchText, setSearchText] = useState("")
  const [lookupKey, setLookupKey] = useState(0)
  const [lookupSerial, setLookupSerial] = useState("")
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(value)

  useEffect(() => {
    setSelectedUnitId(value)
    if (value === null && lookupKey > 0) {
      setLookupKey(0)
      setLookupSerial("")
    }
  }, [value])

  const { data: lookup, isFetching, isError } = useQuery({
    queryKey: ["serial-search-picker", lookupKey, lookupSerial],
    queryFn: () => lookupWarranty(lookupSerial),
    enabled: lookupKey > 0,
  })

  const handleSearch = () => {
    const trimmed = searchText.trim()
    if (!trimmed) return
    setLookupSerial(trimmed)
    setLookupKey((k) => k + 1)
  }

  const handleSelect = () => {
    if (!lookup) return
    setSelectedUnitId(lookup.productUnitId)
    onChange(lookup.productUnitId)
  }

  const handleChangeSerial = () => {
    setSelectedUnitId(null)
    onChange(null)
    setLookupKey(0)
    setLookupSerial("")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value)
    if (isError && lookupKey > 0) {
      setLookupKey(0)
      setLookupSerial("")
    }
  }

  const isEmpty = !searchText.trim()
  const isLoading = isFetching && lookupKey > 0

  let validation: "valid" | "mismatch" | "excluded" | "invalid-status" | null = null
  const isLookedUp = lookupKey > 0 && !isFetching && !isError && lookup
  if (isLookedUp) {
    if (productId && lookup!.productId !== productId) {
      validation = "mismatch"
    } else if (excludeUnitId && lookup!.productUnitId === excludeUnitId) {
      validation = "excluded"
    } else if (lookup!.productUnitStatus !== PRODUCT_UNIT_STATUS.IN_STOCK) {
      validation = "invalid-status"
    } else {
      validation = "valid"
    }
  }

  const isSelected = selectedUnitId !== null && selectedUnitId === lookup?.productUnitId

  const renderWarningCard = (title: string, description: string) => (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">{title}</p>
          <p className="text-amber-600 dark:text-amber-500 mt-1">{description}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleChangeSerial}>
        {t("serialSearch.findAnother")}
      </Button>
    </div>
  )

  return (
    <div className="space-y-3">
      {productName && (
        <p className="text-sm text-muted-foreground">
          {t("serialSearch.productToSwap")}:{" "}
          <span className="font-medium text-foreground">{productName}</span>
        </p>
      )}

      {!isSelected && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch()
              }}
              placeholder={t("serialSearch.placeholder")}
              className="pl-9"
              disabled={disabled || isLoading}
              autoFocus
            />
          </div>
          <Button onClick={handleSearch} disabled={disabled || isLoading || isEmpty}>
            {isLoading ? t("serialSearch.searching") : t("serialSearch.search")}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && !isFetching && lookupKey > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
          <XCircle className="size-4 mt-0.5 shrink-0" />
          <span>
            {t("serialSearch.notFound", { serial: lookupSerial })}
          </span>
        </div>
      )}

      {validation === "valid" && !isSelected && (
        <div
          className="rounded-lg border p-4 space-y-2 cursor-pointer hover:border-primary hover:bg-accent/30 transition-colors"
          onClick={handleSelect}
        >
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{lookup!.productName}</p>
              {lookup!.productSku && (
                <p className="text-xs text-muted-foreground">SKU: {lookup!.productSku}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Serial: <span className="font-mono">{lookup!.serialNumber}</span>
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              handleSelect()
            }}
          >
            {t("serialSearch.selectThis")}
          </Button>
        </div>
      )}

      {validation === "valid" && isSelected && (
        <div className="rounded-lg border border-primary p-4 space-y-2">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{lookup!.productName}</p>
                <Badge variant="default" className="gap-1">
                  <Check className="size-3" /> {t("serialSearch.selected")}
                </Badge>
              </div>
              {lookup!.productSku && (
                <p className="text-xs text-muted-foreground">SKU: {lookup!.productSku}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Serial: <span className="font-mono">{lookup!.serialNumber}</span>
              </p>
            </div>
          </div>
          {!disabled && (
            <Button variant="outline" size="sm" className="w-full" onClick={handleChangeSerial}>
              {t("serialSearch.changeSerial")}
            </Button>
          )}
        </div>
      )}

      {validation === "mismatch" &&
        renderWarningCard(
          t("serialSearch.mismatchTitle", { serial: lookup!.serialNumber }),
          productName
            ? t("serialSearch.mismatchDescWithProduct", { found: lookup!.productName, expected: productName })
            : t("serialSearch.mismatchDesc", { product: lookup!.productName }),
        )}

      {validation === "excluded" &&
        renderWarningCard(
          t("serialSearch.excludedTitle"),
          t("serialSearch.excludedDesc", { serial: lookup!.serialNumber }),
        )}

      {validation === "invalid-status" &&
        renderWarningCard(
          t("serialSearch.invalidStatusTitle", { serial: lookup!.serialNumber, status: statusLabel[lookup!.productUnitStatus] ?? lookup!.productUnitStatus }),
          t("serialSearch.invalidStatusDesc"),
        )}
    </div>
  )
}
