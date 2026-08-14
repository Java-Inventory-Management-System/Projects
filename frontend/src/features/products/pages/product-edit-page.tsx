import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller } from "react-hook-form"
import { useParams, useNavigate, useBlocker } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getProductById, updateProduct, toggleProductActive } from "@/services/product-service"
import { getProductImages, createProductImage, deleteProductImage } from "@/services/product-image-service"
import { useBrands } from "@/hooks/use-brands"
import { useCategories } from "@/hooks/use-categories"
import { useSuppliers } from "@/hooks/use-suppliers"
import type { ProductImage } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { FieldError } from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Upload, X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ToggleActiveButton } from "@/components/toggle-active-button"
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
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

export function ProductEditPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const { data: suppliers = [] } = useSuppliers()
  const productId = Number(id)

  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [images, setImages] = useState<ProductImage[]>([])
  const [showDeleteImgDialog, setShowDeleteImgDialog] = useState<number | null>(null)

  const { register, handleSubmit, control, reset, watch, formState: { errors, isDirty } } = useForm<FormData>({
    defaultValues: { name: "", sku: "", barcode: "", brandId: "", categoryId: "", unit: "", trackingType: "", sellPrice: "", minStock: "0", description: "", supplierIds: [] },
  })

  useEffect(() => {
    if (!id) return
    Promise.all([getProductById(productId), getProductImages(productId)])
      .then(([product, imgs]) => {
        reset({
          name: product.name,
          sku: product.sku ?? "",
          barcode: product.barcode ?? "",
          brandId: product.brandId ? String(product.brandId) : "",
          categoryId: product.categoryId ? String(product.categoryId) : "",
          unit: product.unit ?? "",
          trackingType: product.trackingType ?? "",
          sellPrice: product.sellPrice ? String(product.sellPrice) : "",
          minStock: product.minStock ? String(product.minStock) : "0",
          description: product.description ?? "",
          supplierIds: product.supplierIds ?? [],
        })
        setIsActive(product.isActive)
        setImages(imgs)
      })
      .finally(() => setLoading(false))
  }, [id, productId, reset])

  const save = useMutation({
    mutationFn: (values: FormData) => {
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
      return updateProduct(productId, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] })
      toast.success(t("productForm.updateSuccess"))
      navigatingAfterMut.current = true
      navigate("/products")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const navigatingAfterMut = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !navigatingAfterMut.current && isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  const toggleActive = useMutation({
    mutationFn: () => toggleProductActive(productId),
    onSuccess: () => {
      setIsActive(!isActive)
      toast.success(isActive ? t("productForm.deactivated") : t("productForm.activated"))
      qc.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addImage = useMutation({
    mutationFn: (url: string) => createProductImage({ productId, url, isPrimary: images.length === 0 }),
    onSuccess: (img) => {
      setImages((prev) => [...prev, img])
      toast.success(t("productForm.imageAdded"))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeImage = useMutation({
    mutationFn: (imageId: number) => deleteProductImage(imageId),
    onSuccess: () => {
      setImages((prev) => prev.filter((i) => i.id !== showDeleteImgDialog))
      toast.success(t("productForm.imageDeleted"))
      setShowDeleteImgDialog(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleImageUpload = () => {
    const url = prompt(t("productForm.imageUrlPrompt"))
    if (url?.trim()) addImage.mutate(url.trim())
  }

  const onSubmit = handleSubmit((values) => {
    if (!values.name.trim()) { toast.error(t("productForm.productNameRequired")); return }
    if (values.sku && !/^[A-Za-z0-9-]+$/.test(values.sku)) { toast.error(t("productForm.skuPattern")); return }
    save.mutate(values)
  })

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate("/products")}>{t("productForm.product")}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t("common.edit")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-xl font-semibold tracking-tight">{t("common.edit")} {t("productForm.product")}</h1>
        </div>
        <ToggleActiveButton
          active={isActive}
          name={watch("name")}
          pending={toggleActive.isPending}
          onToggle={() => toggleActive.mutate()}
          confirmDescription={isActive ? t("common.deactivateWarning") : undefined}
        />
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">
                  {t("productForm.productName")} <span className="text-destructive">*</span>
                </Label>
                <Input id="name" required {...register("name", { required: t("productForm.productNameRequired") })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">{t("form.sku")}</Label>
                <Input id="sku" {...register("sku", { pattern: { value: /^[A-Za-z0-9-]*$/, message: t("productForm.skuPattern") } })} />
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
                      <SelectTrigger id="brand"><SelectValue placeholder={t("productForm.brandPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {brands?.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>))}
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
                      <SelectTrigger id="category"><SelectValue placeholder={t("productForm.categoryPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
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
                      <SelectTrigger id="unit"><SelectValue placeholder={t("productForm.unitPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (<SelectItem key={u} value={u}>{t(UNIT_LABELS[u] ?? u)}</SelectItem>))}
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
                          <RadioGroupItem value={tType} id={`edit-tracking-${tType}`} />
                          <Label htmlFor={`edit-tracking-${tType}`} className="font-normal">
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
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="description">{t("productForm.description")}</Label>
              <Textarea id="description" {...register("description")} rows={3} />
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("productImages.heading")}</Label>
              <Button variant="outline" size="sm" onClick={handleImageUpload} disabled={addImage.isPending}>
                <Upload className="size-3.5 mr-1" /> {t("productImages.addUrl")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {images.length === 0 && (
                <Empty>
                  <EmptyTitle>{t("productImages.noImages")}</EmptyTitle>
                </Empty>
              )}
              {images.map((img) => (
                <div key={img.id} className="relative group size-20">
                  <AspectRatio ratio={1}>
                    <img
                      src={img.url}
                      alt={img.isPrimary ? t("productImages.primaryAlt") : t("productImages.imageAlt")}
                      className="size-full object-cover rounded-md border"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = ""
                        ;(e.target as HTMLImageElement).classList.add("hidden")
                      }}
                    />
                  </AspectRatio>
                  {img.isPrimary && (
                    <span className="absolute top-0.5 left-0.5 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                      {t("productImages.primary")}
                    </span>
                  )}
                  <button
                    onClick={() => setShowDeleteImgDialog(img.id)}
                    className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ButtonGroup>
          <Button variant="outline" onClick={() => navigate("/products")}>{t("common.cancel")}</Button>
          <Button onClick={() => onSubmit()} disabled={!watch("name").trim() || watch("supplierIds").length === 0 || save.isPending}>
            {save.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </ButtonGroup>
      </div>

      <AlertDialog
        open={!!showDeleteImgDialog}
        onOpenChange={(v) => {
          if (!v) setShowDeleteImgDialog(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.deleteImageTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteImgDialog && removeImage.mutate(showDeleteImgDialog)}
              disabled={removeImage.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
        onStay={() => blocker.state === "blocked" && blocker.reset()}
        onLeave={() => blocker.state === "blocked" && blocker.proceed()}
      />
    </div>
  )
}
