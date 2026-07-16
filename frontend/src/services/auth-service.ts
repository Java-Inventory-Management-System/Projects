import http, { setToken } from "@/utils/http-client"
import type { LoginRequest, JwtResponse, RefreshTokenResponse } from "@/utils/types"

export async function login(data: LoginRequest): Promise<JwtResponse> {
  const res = await http.post("/auth/login", data)
  const jwt = res as JwtResponse
  setToken(jwt.accessToken)
  return jwt
}

export async function refreshToken(): Promise<RefreshTokenResponse> {
  const res = await http.post("/auth/refresh-token") as RefreshTokenResponse
  setToken(res.accessToken)
  return res
}
