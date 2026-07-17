package org.dawn.backend.constant.security;

public class AuthorizationExpressions {

    private AuthorizationExpressions() {}

    public static final String ROLE_MANAGER = "hasAnyRole('MANAGER')";
    public static final String ROLE_MANAGER_ADMIN = "hasAnyRole('MANAGER', 'ADMIN')";
    public static final String ROLE_MANAGER_STOCK = "hasAnyRole('MANAGER', 'STOCK')";
    public static final String ROLE_MANAGER_ADMIN_STOCK = "hasAnyRole('MANAGER', 'ADMIN', 'STOCK')";
    public static final String ROLE_STOCK_MANAGER_ADMIN = "hasAnyRole('STOCK', 'MANAGER', 'ADMIN')";
    public static final String ROLE_ADMIN_MANAGER_SALES = "hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SALES')";

    public static final String CAN_UPDATE_USER = "@roleSecurity.canUpdate(#id, authentication)";

}
