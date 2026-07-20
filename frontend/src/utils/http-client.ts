import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { toast } from "./toast"

const STORAGE_KEY_TOKEN = "accessToken"
const BASE_URL = import.meta.env.VITE_BASE_API_URL as string ?? "http://localhost:8888/api/v1"

const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  for (const { resolve, reject } of failedQueue) {
    if (error) reject(error)
    else resolve(token!)
  }
  failedQueue = []
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === "object" && "code" in body && "data" in body) {
      if (body.code >= 200 && body.code < 300) return body.data
      return Promise.reject(new Error(body.message || "Lỗi không xác định"))
    }
    return body
  },
  async (error: AxiosError<{ message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return http(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await http.post("/auth/refresh-token") as { accessToken: string }
        const newToken = res.accessToken
        if (newToken) {
          localStorage.setItem(STORAGE_KEY_TOKEN, newToken)
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return http(originalRequest)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_TOKEN)
        processQueue(error, null)
        toast.error("Phiên đăng nhập hết hạn")
      } finally {
        isRefreshing = false
      }
    }

    const message =
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      "Lỗi kết nối"
    return Promise.reject(new Error(message))
  },
)

export function setToken(accessToken: string) {
  localStorage.setItem(STORAGE_KEY_TOKEN, accessToken)
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY_TOKEN)
}

export default http
