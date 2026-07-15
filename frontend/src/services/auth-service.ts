import http, { setToken } from "@/utils/http-client"
import type { LoginRequest, JwtResponse } from "@/utils/types"

function mapJwt(raw: unknown): JwtResponse {
  const r = raw as { accessToken: string; refreshToken: string; userId: number; username: string; role: string }
  return { accessToken: r.accessToken, refreshToken: r.refreshToken, userId: r.userId, username: r.username, role: r.role }
}

export async function login(data: LoginRequest): Promise<JwtResponse> {
  const res = await http.post("/auth/login", data)
  const jwt = mapJwt(res)
  setToken(jwt.accessToken)
  return jwt
}

export async function refreshToken(): Promise<string> {
  const res = await http.post("/auth/refresh-token") as { accessToken: string }
  const token = (res as { accessToken: string }).accessToken
  setToken(token)
  return token
}
