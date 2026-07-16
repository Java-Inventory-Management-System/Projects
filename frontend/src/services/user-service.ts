import http from "@/utils/http-client"

export interface UserResponse {
  id: number
  username: string
  fullName: string
  role: string
  status: string
}

export async function getUserById(id: number): Promise<UserResponse> {
  return await http.get(`/user/${id}`) as UserResponse
}
