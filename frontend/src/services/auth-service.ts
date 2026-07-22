import http, { setToken, clearToken } from "@/utils/http-client"
import type { LoginRequest, JwtResponse, RefreshTokenResponse } from "@/utils/types"

export async function login(data: LoginRequest): Promise<JwtResponse> {
  const res = (await http.post("/auth/login", data)) as JwtResponse
  setToken(res.accessToken)
  return res
}

export async function refreshToken(): Promise<RefreshTokenResponse> {
  const res = (await http.post("/auth/refresh-token")) as RefreshTokenResponse
  setToken(res.accessToken)
  return res
}

export async function logout(): Promise<void> {
  await http.post("/auth/logout")
  clearToken()
}
