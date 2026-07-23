package org.dawn.backend.constant.security;

public class AuthorizationExpressions {

    private AuthorizationExpressions() {}

    // ─── Single roles ─────────────────────────────────────────────────

    /** Single ADMIN role — full system access */
    public static final String ROLE_ADMIN = "hasRole('ADMIN')";

    /** Single MANAGER role — người quản lý kho/phòng ban */
    public static final String ROLE_MANAGER = "hasAnyRole('MANAGER')";

    // ─── Permissions ──────────────────────────────────────────────────

    /** Xem báo cáo, audit log, dashboard — MANAGER/ADMIN */
    public static final String CAN_VIEW_REPORTS = "hasAnyRole('MANAGER', 'ADMIN')";

    /** Approve/reject/cancel các phiếu — MANAGER/ADMIN (4-eyes principle) */
    public static final String CAN_APPROVE = "hasAnyRole('MANAGER', 'ADMIN')";

    /** Thao tác nghiệp vụ kho (tạo phiếu nhập, kiểm kê, điều chỉnh giá) — MANAGER/STOCK */
    public static final String CAN_OPERATE_STOCK = "hasAnyRole('MANAGER', 'STOCK')";

    /** Xem tồn kho, danh mục (readonly) — MANAGER/ADMIN/STOCK */
    public static final String CAN_VIEW_INVENTORY = "hasAnyRole('MANAGER', 'ADMIN', 'STOCK')";

    /** Thao tác bán hàng (xuất kho, bảo hành, trả hàng, khách hàng) — SALES/STOCK/MANAGER/ADMIN */
    public static final String CAN_OPERATE = "hasAnyRole('SALES', 'STOCK', 'MANAGER', 'ADMIN')";

    /** Manage catalog — CRUD sản phẩm, danh mục, NCC, brand */
    public static final String CAN_MANAGE_CATALOG = "hasAnyRole('MANAGER')";

    /** Manage system config — user management, audit, system settings */
    public static final String CAN_MANAGE_SYSTEM = "hasRole('ADMIN')";

    /** Kiểm tra quyền update user — dùng @roleSecurity bean */
    public static final String CAN_UPDATE_USER = "@roleSecurity.canUpdate(#id, authentication)";

}
