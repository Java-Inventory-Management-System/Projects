import type { URole } from "./types"

export const ROLES = {
  ALL_STOCK:      ["STOCK", "MANAGER", "ADMIN"] as URole[],
  MANAGER_ADMIN:  ["MANAGER", "ADMIN"] as URole[],
  MANAGER_STOCK:  ["MANAGER", "STOCK"] as URole[],
  MANAGER:        ["MANAGER"] as URole[],
  ADMIN:          ["ADMIN"] as URole[],
}
