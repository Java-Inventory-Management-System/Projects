import http from "@/utils/http-client"

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const res = (await http.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })) as { url: string }
  return res.url
}