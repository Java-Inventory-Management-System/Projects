import { useState, useCallback } from "react"
import { uploadFile as uploadFileService } from "@/services/file-service"
import { toast } from "@/utils/toast"

export function useFileUpload() {
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null)

  const upload = useCallback(async (file: File, itemId: number): Promise<string | null> => {
    setUploadingItemId(itemId)
    try {
      const url = await uploadFileService(file)
      return url
    } catch (err) {
      toast.error((err as Error).message || "Upload ảnh thất bại")
      return null
    } finally {
      setUploadingItemId(null)
    }
  }, [])

  return { upload, isUploading: uploadingItemId != null, uploadingItemId }
}