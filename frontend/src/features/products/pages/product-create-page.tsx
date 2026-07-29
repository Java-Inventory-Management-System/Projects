import { useForm, Controller } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useCreateProduct } from "@/hooks/use-products"
import { useBrands } from "@/hooks/use-brands"
import { useCategories } from "@/hooks/use-categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FieldError } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/utils/toast"
import { PRODUCT_UNIT_TYPE, TRACKING_TYPE } from "@/utils/types"

const UNITS = [
  PRODUCT_UNIT_TYPE.PIECE,
  PRODUCT_UNIT_TYPE.BOX,
  PRODUCT_UNIT_TYPE.SET,
  PRODUCT_UNIT_TYPE.METER,
  PRODUCT_UNIT_TYPE.KG,
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
}

export function ProductCreatePage() {
  const navigate = useNavigate()
  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { name: "", sku: "", barcode: "", brandId: "", categoryId: "", unit: "", trackingType: "", sellPrice: "", minStock: "0", description: "" },
  })

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
      }
      await createProduct.mutateAsync(payload)
      toast.success("Tạo sản phẩm thành công")
      navigate("/products")
    } catch (err) {
      toast.error((err as Error).message || "Không thể tạo sản phẩm")
    }
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>
          &larr; Quay lại
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Thêm sản phẩm</h1>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              Tên sản phẩm <span className="text-destructive">*</span>
            </Label>
            <Input id="name" required {...register("name", { required: "Tên sản phẩm là bắt buộc" })} placeholder="VD: RAM Kingston 16GB DDR4" />
            <FieldError errors={errors.name ? [{ message: errors.name.message }] : undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register("sku", { pattern: { value: /^[A-Za-z0-9-]*$/, message: "SKU chỉ gồm chữ, số và dấu gạch" } })} placeholder="Tự sinh nếu để trống" />
            <FieldError errors={errors.sku ? [{ message: errors.sku.message }] : undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" {...register("barcode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Thương hiệu</Label>
            <Controller
              control={control}
              name="brandId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Chọn thương hiệu" />
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
            <Label htmlFor="category">Danh mục</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Chọn danh mục" />
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
            <Label htmlFor="unit">Đơn vị tính</Label>
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Chọn ĐVT" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Kiểu theo dõi</Label>
            <Controller
              control={control}
              name="trackingType"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                  {TRACKING_TYPES.map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <RadioGroupItem value={t} id={`tracking-${t}`} />
                      <Label htmlFor={`tracking-${t}`} className="font-normal">
                        {t === TRACKING_TYPE.SERIALIZED ? "Theo serial" : "Hàng rời"}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellPrice">Giá bán</Label>
            <Input id="sellPrice" type="number" min={0} {...register("sellPrice")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minStock">Tồn tối thiểu</Label>
            <Input id="minStock" type="number" min={0} {...register("minStock")} />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="description">Mô tả</Label>
          <Textarea id="description" {...register("description")} rows={3} />
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={() => navigate("/products")}>Hủy</Button>
          <Button type="submit" disabled={!watch("name").trim() || createProduct.isPending}>
            {createProduct.isPending ? "Đang tạo..." : "Tạo sản phẩm"}
          </Button>
        </div>
      </form>
    </div>
  )
}
