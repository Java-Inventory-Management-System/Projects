import { useState, useRef, type DragEvent } from "react"
import { cn } from "@/utils/cn"
import http from "@/utils/http-client"
import { Upload, X, Loader2 } from "lucide-react"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  className?: string
}

const SEP = ","

export const ImageUpload = ({ value, onChange, className }: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const urls: string[] = value ? value.split(SEP).filter(Boolean) : []
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const { url } = (await http.post("/upload", formData)) as { url: string }
      if (url) {
        const next = [...urls, url].join(SEP)
        onChange(next)
      }
    } catch {
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    for (const file of Array.from(e.dataTransfer.files ?? [])) {
      uploadFile(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(e.target.files ?? [])) {
      uploadFile(file)
    }
  }

  const handleRemove = (idx: number) => {
    const next = urls.filter((_, i) => i !== idx).join(SEP)
    onChange(next)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <div key={i} className="relative size-24 rounded-lg overflow-hidden border">
              <img src={url} alt={`upload ${i}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 shadow-xs hover:bg-background"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden" multiple onChange={handleChange} />
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="size-6 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {uploading ? "Đang tải lên..." : "Kéo thả ảnh vào đây, hoặc click để chọn"}
        </p>
        {urls.length > 0 && (
          <p className="text-xs text-muted-foreground">{urls.length} ảnh đã tải lên</p>
        )}
      </div>
    </div>
  )
}