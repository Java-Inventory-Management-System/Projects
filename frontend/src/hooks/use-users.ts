import { useQuery } from "@tanstack/react-query"
import { getUsers, getUserById } from "@/services/user-service"

export function useUsers(page = 0, size = 20, sort?: string) {
  return useQuery({
    queryKey: ["users", page, size, sort],
    queryFn: () => getUsers(page, size, sort),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}

export function useUserById(id: number) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => getUserById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}
