import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getProductById, updateProduct, toggleProductActive } from "@/features/products/services/product-service"
import { getProductImages, createProductImage, deleteProductImage } from "@/features/products/services/product-image-service"
import { useBrands } from "@/hooks/use-brands"
import { useCategories } from "@/hooks/use-categories"
import type { ProductImage } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, Upload, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/utils/toast"

const UNITS = ["PIECE", "BOX", "SET", "METER", "KG"]
const TRACKING_TYPES = ["SERIALIZED", "BULK"]

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const productId = Number(id)

  const [loading, setLoading] = useState(true)
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
  const [isActive, setIsActive] = useState(true)

  const [images, setImages] = useState<ProductImage[]>([])
  const [showDeleteImgDialog, setShowDeleteImgDialog] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getProductById(productId),
      getProductImages(productId),
    ]).then(([product, imgs]) => {
      setName(product.name); setSku(product.sku ?? ""); setBarcode(product.barcode ?? "")
      setBrandId(product.brandId ? String(product.brandId) : "")
      setCategoryId(product.categoryId ? String(product.categoryId) : "")
      setUnit(product.unit ?? ""); setTrackingType(product.trackingType ?? "")
      setSellPrice(product.sellPrice ? String(product.sellPrice) : "")
      setMinStock(product.minStock ? String(product.minStock) : "0")
      setDescription(product.description ?? ""); setIsActive(product.isActive)
      setImages(imgs)
    }).finally(() => setLoading(false))
  }, [id])

  const save = useMutation({
    mutationFn: () => updateProduct(productId, {
      name: name.trim(), sku: sku || null, barcode: barcode || null,
      brandId: brandId ? Number(brandId) : null, categoryId: categoryId ? Number(categoryId) : null,
      unit: unit || null, trackingType: trackingType || null,
      sellPrice: sellPrice ? Number(sellPrice) : null, minStock: minStock ? Number(minStock) : null,
      description: description || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Cập nhật thành công"); navigate("/products") },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActive = useMutation({
    mutationFn: () => toggleProductActive(productId),
    onSuccess: () => { setIsActive(!isActive); toast.success(isActive ? "Đã vô hiệu hóa" : "Đã kích hoạt"); qc.invalidateQueries({ queryKey: ["products"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const addImage = useMutation({
    mutationFn: (url: string) => createProductImage({ productId, url, isPrimary: images.length === 0 }),
    onSuccess: (img) => { setImages((prev) => [...prev, img]); toast.success("Đã thêm ảnh") },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeImage = useMutation({
    mutationFn: (imageId: number) => deleteProductImage(imageId),
    onSuccess: () => { setImages((prev) => prev.filter((i) => i.id !== showDeleteImgDialog)); toast.success("Đã xóa ảnh"); setShowDeleteImgDialog(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleImageUpload = () => {
    const url = prompt("Nhập URL ảnh:")
    if (url?.trim()) addImage.mutate(url.trim())
  }

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Tên sản phẩm là bắt buộc"); return }
    if (sku && !/^[A-Za-z0-9-]+$/.test(sku)) { toast.error("SKU chỉ gồm chữ, số và dấu gạch"); return }
    save.mutate()
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/products")}>Sản phẩm</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Sửa</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-xl font-semibold tracking-tight">Sửa sản phẩm</h1>
        </div>
        <Switch checked={isActive} onCheckedChange={() => toggleActive.mutate()} disabled={toggleActive.isPending} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Tên sản phẩm <span className="text-destructive">*</span></Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
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
            <div className="space-y-2">
              <Label htmlFor="trackingType">Kiểu theo dõi</Label>
              <Select value={trackingType} onValueChange={setTrackingType}>
                <SelectTrigger id="trackingType"><SelectValue placeholder="Chọn kiểu" /></SelectTrigger>
                <SelectContent>
                  {TRACKING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Hình ảnh</Label>
              <Button variant="outline" size="sm" onClick={handleImageUpload} disabled={addImage.isPending}>
                <Upload className="size-3.5 mr-1" /> Thêm URL
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {images.length === 0 && (
                <Empty>
                  <EmptyTitle>Chưa có ảnh</EmptyTitle>
                </Empty>
              )}
              {images.map((img) => (
                <div key={img.id} className="relative group size-20">
                  <AspectRatio ratio={1}>
                    <img src={img.url} alt="" className="size-full object-cover rounded-md border" onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).classList.add("hidden") }} />
                  </AspectRatio>
                  {img.isPrimary && <span className="absolute top-0.5 left-0.5 text-[10px] bg-primary text-primary-foreground px-1 rounded">Chính</span>}
                  <button onClick={() => setShowDeleteImgDialog(img.id)} className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <Button variant="outline" onClick={() => navigate("/products")}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || save.isPending}>
            {save.isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </ButtonGroup>
      </div>

      <AlertDialog open={!!showDeleteImgDialog} onOpenChange={(v) => { if (!v) setShowDeleteImgDialog(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ảnh</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc muốn xóa ảnh này?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction onClick={() => showDeleteImgDialog && removeImage.mutate(showDeleteImgDialog)} disabled={removeImage.isPending} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
