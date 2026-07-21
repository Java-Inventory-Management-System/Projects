import http from "@/utils/http-client"
import type { UserResponse, ResponsePage } from "@/utils/types"
import { mapResponsePage } from "@/utils/mappers"

export interface CreateUserRequest {
  fullName: string
  email: string
  roleName: string
  status?: string
}

export interface UpdateInfoRequest {
  fullName?: string
  gender?: number | null
  dob?: string | null
  phoneNumber?: string | null
}

export interface CreateUserResponse extends UserResponse {
  tempPassword: string
}

function mapUser(raw: unknown): UserResponse {
  const r = raw as {
    id: number; username: string; fullName: string; email: string
    role: string; status: string; gender?: number | null; dob?: string | null
    phoneNumber?: string | null; isPasswordReset?: boolean; isDeleted?: boolean
    createdAt: string; updatedAt: string
  }
  return {
    id: r.id, username: r.username, fullName: r.fullName, email: r.email,
    role: r.role as UserResponse["role"], status: r.status,
    gender: r.gender ?? null, dob: r.dob ?? null, phoneNumber: r.phoneNumber ?? null,
    isPasswordReset: r.isPasswordReset ?? false, isDeleted: r.isDeleted ?? false,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
}

export async function getUsers(page = 0, size = 20, sort?: string): Promise<ResponsePage<UserResponse>> {
  const res = await http.get("/user", { params: { page, size, ...(sort ? { sort } : {}) } })
  return mapResponsePage(res, mapUser)
}

export async function getUserById(id: number): Promise<UserResponse> {
  const res = await http.get(`/user/${id}`)
  return mapUser(res)
}

export async function createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
  const res = await http.post("/user", data)
  return { ...mapUser(res), tempPassword: (res as { tempPassword: string }).tempPassword }
}

export async function updateUserInfo(id: number, data: UpdateInfoRequest): Promise<UserResponse> {
  const res = await http.put(`/user/${id}/info`, data)
  return mapUser(res)
}

export async function updateUserStatus(id: number, active: boolean): Promise<UserResponse> {
  const res = await http.put(`/user/${id}/status`, { active })
  return mapUser(res)
}

export async function updateUserRole(id: number, roleName: string): Promise<UserResponse> {
  const res = await http.put(`/user/${id}/role`, roleName, {
    headers: { "Content-Type": "text/plain" },
  })
  return mapUser(res)
}

export async function resetPassword(id: number): Promise<string> {
  const res = await http.put(`/auth/${id}/reset-password`)
  return (res as { tempPassword: string }).tempPassword
}
