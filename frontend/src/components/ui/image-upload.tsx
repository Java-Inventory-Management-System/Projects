import { useState, useRef, type DragEvent } from "react"
import { cn } from "@/utils/cn"
import http from "@/utils/http-client"
import { Upload, X, Loader2 } from "lucide-react"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  className?: string
}

export const ImageUpload = ({ value, onChange, className }: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(value ?? "")
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const { url } = await http.post("/upload", formData) as { url: string }
      if (url) {
        setPreview(url)
        onChange(url)
      }
    } catch {
      // ignore
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleRemove = () => {
    setPreview("")
    onChange("")
    if (inputRef.current) inputRef.current.value = ""
  }

  if (preview) {
    return (
      <div className={cn("relative inline-block rounded-lg overflow-hidden border", className)}>
        <img src={preview} alt="upload preview" className="max-h-48 w-full object-contain bg-muted/20" />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-1 right-1 rounded-full bg-background/80 p-1 shadow-xs hover:bg-background"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
        uploading && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {uploading ? (
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="size-8 text-muted-foreground" />
      )}
      <p className="text-sm text-muted-foreground">
        {uploading ? "Đang tải lên..." : "Kéo thả ảnh vào đây, hoặc click để chọn"}
      </p>
    </div>
  )
}
