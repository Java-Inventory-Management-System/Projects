import type { URole } from "./types"

export const ROLES = {
  ADMIN: ["ADMIN"] as URole[],
  MANAGER: ["MANAGER", "ADMIN"] as URole[],

  CAN_VIEW_REPORTS: ["MANAGER", "ADMIN"] as URole[],
  CAN_APPROVE: ["MANAGER", "ADMIN"] as URole[],
  CAN_MANAGE_CATALOG: ["MANAGER", "ADMIN"] as URole[],
  CAN_MANAGE_SYSTEM: ["ADMIN"] as URole[],
  CAN_OPERATE_STOCK: ["MANAGER", "STOCK"] as URole[],
  SEAL_BOX: ["STOCK"] as URole[],
  MANAGE_LOCATION: ["STOCK", "ADMIN"] as URole[],
  CAN_VIEW_QC: ["MANAGER", "STOCK", "ADMIN"] as URole[],
  CAN_CREATE_TRANSACTION: ["SALES"] as URole[],
  CAN_CREATE_PRICE_ADJUSTMENT: ["MANAGER", "ADMIN"] as URole[],
  CAN_VIEW_INVENTORY: ["MANAGER", "ADMIN", "STOCK"] as URole[],
  CAN_OPERATE: ["ADMIN", "SALES", "STOCK", "MANAGER"] as URole[],
  CAN_VIEW_PRODUCTS: ["ADMIN", "SALES", "STOCK", "MANAGER"] as URole[],
}
