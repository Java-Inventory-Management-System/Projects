import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller } from "react-hook-form"
import { useBlocker, useNavigate } from "react-router-dom"
import { useCreateProduct } from "@/hooks/use-products"
import { useBrands } from "@/hooks/use-brands"
import { useCategories } from "@/hooks/use-categories"
import { useSuppliers } from "@/hooks/use-suppliers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FieldError } from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/utils/toast"
import { PRODUCT_UNIT_TYPE, TRACKING_TYPE } from "@/utils/types"
import { UNIT_LABELS } from "@/utils/labels"

const UNITS = [
  PRODUCT_UNIT_TYPE.PIECE,
  PRODUCT_UNIT_TYPE.BOX,
  PRODUCT_UNIT_TYPE.SET,
  PRODUCT_UNIT_TYPE.METER,
  PRODUCT_UNIT_TYPE.KG,
  PRODUCT_UNIT_TYPE.TUBE,
]
const TRACKING_TYPES = [TRACKING_TYPE.SERIALIZED, TRACKING_TYPE.BULK]

interface FormData {
  name: string
  sku: string
  barcode: string
  brandId: string
  categoryId: string
  unit: string
  trackingType: string
  sellPrice: string
  minStock: string
  description: string
  supplierIds: number[]
}

export function ProductCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const { data: suppliers = [] } = useSuppliers()
  const createProduct = useCreateProduct()

  const { register, handleSubmit, control, watch, formState: { errors, isDirty } } = useForm<FormData>({
    defaultValues: { name: "", sku: "", barcode: "", brandId: "", categoryId: "", unit: "", trackingType: "", sellPrice: "", minStock: "0", description: "", supplierIds: [] },
  })

  const navigatingAfterMut = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !navigatingAfterMut.current && isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name.trim(),
        sku: values.sku || "",
        unit: values.unit || "",
        retailPrice: values.sellPrice ? Number(values.sellPrice) : 0,
        brandId: values.brandId ? Number(values.brandId) : null,
        categoryId: values.categoryId ? Number(values.categoryId) : null,
        barcode: values.barcode || null,
        trackingType: values.trackingType || null,
        minStock: values.minStock ? Number(values.minStock) : undefined,
        description: values.description || undefined,
        supplierIds: values.supplierIds || [],
      }
      await createProduct.mutateAsync(payload)
      toast.success(t("productForm.createSuccess"))
      navigatingAfterMut.current = true
      navigate("/products")
    } catch (err) {
      toast.error((err as Error).message || t("productForm.createError"))
    }
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>
          &larr; {t("productForm.back")}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("productForm.create")}</h1>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              {t("productForm.productName")} <span className="text-destructive">*</span>
            </Label>
            <Input id="name" required {...register("name", { required: t("productForm.productNameRequired") })} placeholder={t("productForm.productNamePlaceholder")} />
            <FieldError errors={errors.name ? [{ message: errors.name.message }] : undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">{t("form.sku")}</Label>
            <Input id="sku" {...register("sku", { pattern: { value: /^[A-Za-z0-9-]*$/, message: t("productForm.skuPattern") } })} placeholder={t("productForm.skuPlaceholder")} />
            <FieldError errors={errors.sku ? [{ message: errors.sku.message }] : undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode">{t("productForm.barcode")}</Label>
            <Input id="barcode" {...register("barcode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">{t("productForm.brand")}</Label>
            <Controller
              control={control}
              name="brandId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder={t("productForm.brandPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {brands?.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t("productForm.category")}</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder={t("productForm.categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">{t("productForm.unit")}</Label>
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder={t("productForm.unitPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{t(UNIT_LABELS[u] ?? u)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("productForm.suppliers")} <span className="text-destructive">*</span></Label>
            <Controller
              control={control}
              name="supplierIds"
              rules={{ validate: (v) => v.length > 0 || t("productForm.suppliersRequired") }}
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2 rounded-lg border p-3">
                  {suppliers.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(s.id)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked ? [...field.value, s.id] : field.value.filter((id) => id !== s.id),
                          )
                        }
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
            />
            <FieldError errors={errors.supplierIds ? [{ message: errors.supplierIds.message }] : undefined} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("productForm.trackingType")}</Label>
            <Controller
              control={control}
              name="trackingType"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                  {TRACKING_TYPES.map((tType) => (
                    <div key={tType} className="flex items-center gap-2">
                      <RadioGroupItem value={tType} id={`tracking-${tType}`} />
                      <Label htmlFor={`tracking-${tType}`} className="font-normal">
                        {tType === TRACKING_TYPE.SERIALIZED ? t("productForm.trackingSerial") : t("productForm.trackingBulk")}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellPrice">{t("productForm.sellPrice")}</Label>
            <Input id="sellPrice" type="number" min={0} {...register("sellPrice")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minStock">{t("productForm.minStock")}</Label>
            <Input id="minStock" type="number" min={0} {...register("minStock")} />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="description">{t("productForm.description")}</Label>
          <Textarea id="description" {...register("description")} rows={3} />
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={() => navigate("/products")}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={!watch("name").trim() || watch("supplierIds").length === 0 || createProduct.isPending}>
            {createProduct.isPending ? t("productForm.creating") : t("productForm.create")}
          </Button>
        </div>
      </form>

      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
        onStay={() => blocker.state === "blocked" && blocker.reset()}
        onLeave={() => blocker.state === "blocked" && blocker.proceed()}
      />
    </div>
  )
}
