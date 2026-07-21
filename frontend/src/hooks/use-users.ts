import { useQuery } from "@tanstack/react-query"
import { getUsers, getUserById } from "@/services/user-service"

export function useUsers(page = 0, size = 20) {
  return useQuery({
    queryKey: ["users", page, size],
    queryFn: () => getUsers(page, size),
  })
}

export function useUserById(id: number) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => getUserById(id),
    enabled: !!id,
  })
}
