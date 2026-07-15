import type {
  BrandResponse,
  CategoryResponse,
  UserResponse,
  AuditLog,
  LocationResponse,
} from "@/utils/types"

// ==================== BRANDS (hardcoded) ====================

export const brands: BrandResponse[] = [
  { id: 1, name: "ASUS", description: "Mainboard, GPU, linh kiện cao cấp", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, name: "Gigabyte", description: "Mainboard, GPU, linh kiện", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, name: "MSI", description: "Mainboard, GPU, linh kiện gaming", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Intel", description: "CPU, chipset", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, name: "AMD", description: "CPU, GPU", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 6, name: "Samsung", description: "SSD, RAM, lưu trữ", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 7, name: "Corsair", description: "RAM, PSU, Case, Cooling", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 8, name: "Western Digital", description: "SSD, HDD", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 9, name: "Seasonic", description: "PSU cao cấp", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 10, name: "G.Skill", description: "RAM hiệu năng cao", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 11, name: "Cooler Master", description: "Case, Cooling, PSU", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 12, name: "Noctua", description: "Cooling cao cấp", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 13, name: "Kingston", description: "RAM, SSD", isActive: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

// ==================== CATEGORIES (hardcoded) ====================

export const categories: CategoryResponse[] = [
  { id: 1, name: "CPU", description: "Bộ vi xử lý Intel, AMD", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, name: "RAM", description: "Bộ nhớ trong DDR4, DDR5", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, name: "GPU", description: "Card đồ họa VGA", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Mainboard", description: "Bo mạch chủ", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, name: "PSU", description: "Nguồn máy tính", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 6, name: "Storage", description: "SSD, HDD, NVMe", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 7, name: "Case", description: "Vỏ máy tính", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 8, name: "Cooling", description: "Tản nhiệt, quạt", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

// ==================== LOCATIONS (hardcoded) ====================

export const locations: LocationResponse[] = [
  { id: 1, zoneCode: "A", shelfCode: "01", binCode: "01", fullCode: "A-01-01", description: "CPU Intel", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, zoneCode: "A", shelfCode: "01", binCode: "02", fullCode: "A-01-02", description: "CPU Intel", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, zoneCode: "A", shelfCode: "02", binCode: "01", fullCode: "A-02-01", description: "CPU AMD", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, zoneCode: "A", shelfCode: "02", binCode: "02", fullCode: "A-02-02", description: "CPU AMD", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, zoneCode: "B", shelfCode: "01", binCode: "01", fullCode: "B-01-01", description: "GPU ASUS", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 6, zoneCode: "B", shelfCode: "01", binCode: "02", fullCode: "B-01-02", description: "GPU Gigabyte", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 7, zoneCode: "B", shelfCode: "02", binCode: "01", fullCode: "B-02-01", description: "GPU MSI", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 8, zoneCode: "B", shelfCode: "02", binCode: "02", fullCode: "B-02-02", description: "GPU ASUS TUF", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 9, zoneCode: "C", shelfCode: "01", binCode: "01", fullCode: "C-01-01", description: "SSD Samsung", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 10, zoneCode: "C", shelfCode: "01", binCode: "02", fullCode: "C-01-02", description: "SSD Samsung", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 11, zoneCode: "C", shelfCode: "02", binCode: "01", fullCode: "C-02-01", description: "SSD WD", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 12, zoneCode: "C", shelfCode: "02", binCode: "02", fullCode: "C-02-02", description: "SSD Samsung 980", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 13, zoneCode: "C", shelfCode: "03", binCode: "01", fullCode: "C-03-01", description: "SSD WD Blue", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 14, zoneCode: "D", shelfCode: "01", binCode: "01", fullCode: "D-01-01", description: "RAM Corsair", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 15, zoneCode: "D", shelfCode: "01", binCode: "02", fullCode: "D-01-02", description: "RAM Corsair Dominator", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 16, zoneCode: "D", shelfCode: "02", binCode: "01", fullCode: "D-02-01", description: "RAM G.Skill", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 17, zoneCode: "E", shelfCode: "01", binCode: "01", fullCode: "E-01-01", description: "Mainboard ASUS ROG", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 18, zoneCode: "E", shelfCode: "01", binCode: "02", fullCode: "E-01-02", description: "Mainboard Gigabyte", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 19, zoneCode: "E", shelfCode: "02", binCode: "01", fullCode: "E-02-01", description: "Mainboard MSI", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 20, zoneCode: "E", shelfCode: "02", binCode: "02", fullCode: "E-02-02", description: "Mainboard ASUS Prime", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 21, zoneCode: "F", shelfCode: "01", binCode: "01", fullCode: "F-01-01", description: "PSU Seasonic Focus", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 22, zoneCode: "F", shelfCode: "01", binCode: "02", fullCode: "F-01-02", description: "PSU Corsair RM", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 23, zoneCode: "F", shelfCode: "02", binCode: "01", fullCode: "F-02-01", description: "PSU Seasonic Prime", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 24, zoneCode: "G", shelfCode: "01", binCode: "01", fullCode: "G-01-01", description: "Case Corsair 4000D White", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 25, zoneCode: "G", shelfCode: "01", binCode: "02", fullCode: "G-01-02", description: "Case Corsair 4000D Black", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 26, zoneCode: "G", shelfCode: "02", binCode: "01", fullCode: "G-02-01", description: "Case ASUS Helios", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 27, zoneCode: "H", shelfCode: "01", binCode: "01", fullCode: "H-01-01", description: "Cooling Corsair AIO", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 28, zoneCode: "H", shelfCode: "01", binCode: "02", fullCode: "H-02-01", description: "Cooling Cooler Master", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 29, zoneCode: "H", shelfCode: "02", binCode: "01", fullCode: "H-02-01", description: "Cooling ASUS ROG", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 30, zoneCode: "H", shelfCode: "02", binCode: "02", fullCode: "H-02-02", description: "Cooling Noctua", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 31, zoneCode: "I", shelfCode: "01", binCode: "01", fullCode: "I-01-01", description: "Linh kiện lẻ — chờ phân loại", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 32, zoneCode: "X", shelfCode: "01", binCode: "01", fullCode: "X-01-01", description: "Khu vực cách ly — hàng hỏng/lỗi", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

// ==================== USERS (hardcoded) ====================

export const users: UserResponse[] = [
  { id: 1, username: "admin", fullName: "System Admin", email: "admin@warehouse.com", role: "ADMIN", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, username: "manager", fullName: "Nguyễn Văn A — Quản lý kho", email: "manager@warehouse.com", role: "MANAGER", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, username: "sales", fullName: "Trần Thị B — Nhân viên bán hàng", email: "sales@warehouse.com", role: "SALES", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, username: "stock", fullName: "Lê Văn C — Nhân viên kho", email: "stock@warehouse.com", role: "STOCK", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, username: "phamvantuan", fullName: "Phạm Văn Tuấn", email: "tuanpv@warehouse.com", role: "MANAGER", status: "ACTIVE", gender: 1, dob: "1990-03-10T00:00:00Z", phoneNumber: "0934567890", isPasswordReset: false, isDeleted: false, createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-01-15T00:00:00Z" },
  { id: 6, username: "nguyenvanh", fullName: "Nguyễn Văn Hùng", email: "hungnv@warehouse.com", role: "STOCK", status: "ACTIVE", gender: 1, dob: "1995-06-15T00:00:00Z", phoneNumber: "0912345678", isPasswordReset: true, isDeleted: false, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: 7, username: "tranthimai", fullName: "Trần Thị Mai", email: "maitt@warehouse.com", role: "SALES", status: "ACTIVE", gender: 0, dob: "1998-11-20T00:00:00Z", phoneNumber: "0923456789", isPasswordReset: false, isDeleted: false, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: 8, username: "lethuhuyen", fullName: "Lê Thu Huyền", email: "huyenlt@warehouse.com", role: "STOCK", status: "INACTIVE", gender: 0, dob: "2000-09-05T00:00:00Z", phoneNumber: "0945678901", isPasswordReset: false, isDeleted: false, createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 9, username: "hoangminhduc", fullName: "Hoàng Minh Đức", email: "duchm@warehouse.com", role: "ADMIN", status: "ACTIVE", gender: 1, dob: "1988-12-25T00:00:00Z", phoneNumber: "0956789012", isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 10, username: "dangthilan", fullName: "Đặng Thị Lan", email: "landt@warehouse.com", role: "SALES", status: "ACTIVE", gender: 0, dob: "1997-07-30T00:00:00Z", phoneNumber: "0967890123", isPasswordReset: true, isDeleted: true, createdAt: "2026-02-15T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
]

// ==================== AUDIT LOGS (hardcoded) ====================

export const auditLogs: AuditLog[] = [
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-001", action: "CREATE_PRODUCT", entityName: "PRODUCT", entityId: "1", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T08:30:00Z" },
  { userId: 2, username: "manager", ipAddress: "192.168.1.101", requestId: "req-002", action: "UPDATE_PRODUCT", entityName: "PRODUCT", entityId: "2", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T08:35:00Z" },
  { userId: 4, username: "stock", ipAddress: "192.168.1.102", requestId: "req-003", action: "IMPORT_RECEIPT", entityName: "IMPORT_RECEIPT", entityId: "10", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T09:00:00Z" },
  { userId: 3, username: "sales", ipAddress: "192.168.1.103", requestId: "req-004", action: "LOGIN", entityName: "AUTH", entityId: null, oldValue: null, newValue: null, status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T09:15:00Z" },
  { userId: 0, username: null, ipAddress: "192.168.1.200", requestId: "req-005", action: "LOGIN", entityName: "AUTH", entityId: null, oldValue: null, newValue: null, status: "ERROR", errorMsg: "Sai mật khẩu", createdAt: "2026-07-14T09:20:00Z" },
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-006", action: "UPDATE_USER_ROLE", entityName: "USER", entityId: "5", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T10:00:00Z" },
  { userId: 2, username: "manager", ipAddress: "192.168.1.101", requestId: "req-007", action: "CREATE_SUPPLIER", entityName: "SUPPLIER", entityId: "6", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T10:30:00Z" },
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-008", action: "CREATE_BRAND", entityName: "BRAND", entityId: "11", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-13T15:00:00Z" },
  { userId: 4, username: "stock", ipAddress: "192.168.1.102", requestId: "req-009", action: "STOCK_CHECK", entityName: "STOCK_CHECK", entityId: "5", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-13T14:45:00Z" },
  { userId: 3, username: "sales", ipAddress: "192.168.1.103", requestId: "req-010", action: "EXPORT_RECEIPT", entityName: "EXPORT_RECEIPT", entityId: "12", oldValue: null, newValue: "{}", status: "ERROR", errorMsg: "Thiếu thông tin bắt buộc", createdAt: "2026-07-13T14:00:00Z" },
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-011", action: "STOCK_ADJUSTMENT", entityName: "STOCK_ADJUSTMENT", entityId: "1", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-13T11:00:00Z" },
  { userId: 2, username: "manager", ipAddress: "192.168.1.101", requestId: "req-012", action: "WARRANTY_REQUEST", entityName: "WARRANTY_REQUEST", entityId: "3", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-12T16:00:00Z" },
]
