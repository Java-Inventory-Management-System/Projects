package org.dawn.backend.constant.security;

public class AuthorizationExpressions {

    private AuthorizationExpressions() {}

    /** Single ADMIN role — full system access */
    public static final String ROLE_ADMIN = "@securityPolicy.hasRole('ADMIN')";

    /** Single MANAGER role */
    public static final String ROLE_MANAGER = "@securityPolicy.hasAnyRole('MANAGER')";

    /** Xem báo cáo, audit log, dashboard — MANAGER/ADMIN */
    public static final String CAN_VIEW_REPORTS = "@securityPolicy.hasAnyRole('MANAGER', 'ADMIN')";

    /** Approve/reject/cancel — MANAGER/ADMIN (4-eyes principle) */
    public static final String CAN_APPROVE = "@securityPolicy.hasAnyRole('MANAGER', 'ADMIN')";

    /** Thao tác nghiệp vụ kho (nhập, kiểm kê, điều chỉnh) — MANAGER/STOCK */
    public static final String CAN_OPERATE_STOCK = "@securityPolicy.hasAnyRole('MANAGER', 'STOCK')";

    /** Xem tồn kho, danh mục — MANAGER/ADMIN/STOCK */
    public static final String CAN_VIEW_INVENTORY = "@securityPolicy.hasAnyRole('MANAGER', 'ADMIN', 'STOCK')";

    /** Thao tác bán hàng (xuất kho, bảo hành, trả hàng) — SALES/STOCK/MANAGER */
    public static final String CAN_OPERATE = "@securityPolicy.hasAnyRole('SALES', 'STOCK', 'MANAGER')";

    /** Manage catalog — CRUD sản phẩm, danh mục, NCC, brand */
    public static final String CAN_MANAGE_CATALOG = "@securityPolicy.hasAnyRole('MANAGER')";

    /** Manage system — user management, audit, settings */
    public static final String CAN_MANAGE_SYSTEM = "@securityPolicy.hasRole('ADMIN')";

    /** Kiểm tra quyền update user */
    public static final String CAN_UPDATE_USER = "@securityPolicy.canUpdate(#id, authentication)";

}
