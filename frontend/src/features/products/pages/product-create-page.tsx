import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/utils/toast"

const UNITS = ["PIECE", "BOX", "SET", "METER", "KG"]
const TRACKING_TYPES = ["SERIALIZED", "BULK"]

export function ProductCreatePage() {
  const navigate = useNavigate()
  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()

  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [brandId, setBrandId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [unit, setUnit] = useState("")
  const [trackingType, setTrackingType] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [minStock, setMinStock] = useState("0")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const clearError = (field: string) => setErrors((prev) => { const n = { ...prev }; delete n[field]; return n })

  const handleSubmit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Tên sản phẩm là bắt buộc"
    if (sku && !/^[A-Za-z0-9-]+$/.test(sku)) e.sku = "SKU chỉ gồm chữ, số và dấu gạch"
    setErrors(e)
    if (Object.keys(e).length > 0) return

    try {
      await createProduct.mutateAsync({
        name: name.trim(),
        sku: sku || null,
        barcode: barcode || null,
        brandId: brandId ? Number(brandId) : null,
        categoryId: categoryId ? Number(categoryId) : null,
        unit: unit || null,
        trackingType: trackingType || null,
        sellPrice: sellPrice ? Number(sellPrice) : null,
        minStock: minStock ? Number(minStock) : null,
        description: description || null,
      })
      toast.success("Tạo sản phẩm thành công")
      navigate("/products")
    } catch (err) {
      toast.error((err as Error).message || "Không thể tạo sản phẩm")
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>
          &larr; Quay lại
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Thêm sản phẩm</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Tên sản phẩm <span className="text-destructive">*</span></Label>
          <Input id="name" required value={name} onChange={(e) => { setName(e.target.value); clearError("name") }} placeholder="VD: RAM Kingston 16GB DDR4" />
          <FieldError errors={errors.name ? [{ message: errors.name }] : undefined} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" value={sku} onChange={(e) => { setSku(e.target.value); clearError("sku") }} placeholder="Tự sinh nếu để trống" />
          <FieldError errors={errors.sku ? [{ message: errors.sku }] : undefined} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Thương hiệu</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger id="brand"><SelectValue placeholder="Chọn thương hiệu" /></SelectTrigger>
            <SelectContent>
              {brands?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Danh mục</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
            <SelectContent>
              {categories?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Đơn vị tính</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger id="unit"><SelectValue placeholder="Chọn ĐVT" /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Kiểu theo dõi</Label>
          <RadioGroup value={trackingType} onValueChange={setTrackingType} className="flex gap-6">
            {TRACKING_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <RadioGroupItem value={t} id={`tracking-${t}`} />
                <Label htmlFor={`tracking-${t}`} className="font-normal">{t === "SERIALIZED" ? "Theo serial" : "Hàng rời"}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sellPrice">Giá bán</Label>
          <Input id="sellPrice" type="number" min={0} value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minStock">Tồn tối thiểu</Label>
          <Input id="minStock" type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/products")}>Hủy</Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || createProduct.isPending}>
          {createProduct.isPending ? "Đang tạo..." : "Tạo sản phẩm"}
        </Button>
      </div>
    </div>
  )
}
