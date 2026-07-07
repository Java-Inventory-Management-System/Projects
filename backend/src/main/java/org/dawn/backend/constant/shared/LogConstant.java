package org.dawn.backend.constant.shared;

public class LogConstant {
    public static class Action {
        public static final String CREATE_USER = "CREATE_USER";
        public static final String UPDATE_INFO = "UPDATE_USER_INFO";
        public static final String UPDATE_STATUS = "UPDATE_USER_STATUS";
        public static final String UPDATE_ROLE = "UPDATE_USER_ROLE";
        public static final String CHANGE_PASSWORD = "CHANGE_PASSWORD";
        public static final String RESET_PASSWORD = "RESET_PASSWORD";
        public static final String CREATE_BRAND = "CREATE_BRAND";
        public static final String UPDATE_BRAND = "UPDATE_BRAND";
        public static final String TOGGLE_BRAND = "TOGGLE_BRAND";
        public static final String CREATE_CATEGORY = "CREATE_CATEGORY";
        public static final String UPDATE_CATEGORY = "UPDATE_CATEGORY";
        public static final String TOGGLE_CATEGORY = "TOGGLE_CATEGORY";
        public static final String CREATE_SUPPLIER = "CREATE_SUPPLIER";
        public static final String UPDATE_SUPPLIER = "UPDATE_SUPPLIER";
        public static final String TOGGLE_SUPPLIER = "TOGGLE_SUPPLIER";
        public static final String CREATE_PRODUCT = "CREATE_PRODUCT";
        public static final String UPDATE_PRODUCT = "UPDATE_PRODUCT";
        public static final String TOGGLE_PRODUCT = "TOGGLE_PRODUCT";
    }

    public static class Entity {
        public static final String USER = "USER";
        public static final String BRAND = "BRAND";
        public static final String CATEGORY = "CATEGORY";
        public static final String SUPPLIER = "SUPPLIER";
        public static final String PRODUCT = "PRODUCT";
    }

    public static class Status {
        public static final String SUCCESS = "SUCCESS";
        public static final String FAILED = "FAILED";
    }
}
