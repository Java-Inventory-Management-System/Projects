package org.dawn.backend.constant.shared;

public class LogConstant {
    public static class Action {
        public static final String CREATE_PRICE_ADJUSTMENT = "CREATE_PRICE_ADJUSTMENT";
        public static final String APPROVE_PRICE_ADJUSTMENT = "APPROVE_PRICE_ADJUSTMENT";
        public static final String REJECT_PRICE_ADJUSTMENT = "REJECT_PRICE_ADJUSTMENT";
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
        public static final String CREATE_IMPORT = "CREATE_IMPORT";
        public static final String CONFIRM_IMPORT = "CONFIRM_IMPORT";
        public static final String APPROVE_IMPORT = "APPROVE_IMPORT";
        public static final String CANCEL_IMPORT = "CANCEL_IMPORT";
        public static final String EDIT_SERIAL = "EDIT_SERIAL";
        public static final String CREATE_LOCATION = "CREATE_LOCATION";
        public static final String UPDATE_LOCATION = "UPDATE_LOCATION";
        public static final String DELETE_LOCATION = "DELETE_LOCATION";
        public static final String TOGGLE_LOCATION = "TOGGLE_LOCATION";
        public static final String CREATE_CUSTOMER = "CREATE_CUSTOMER";
        public static final String UPDATE_CUSTOMER = "UPDATE_CUSTOMER";
        public static final String TOGGLE_CUSTOMER = "TOGGLE_CUSTOMER";
        public static final String CREATE_EXPORT = "CREATE_EXPORT";
        public static final String APPROVE_EXPORT = "APPROVE_EXPORT";
        public static final String REJECT_EXPORT = "REJECT_EXPORT";
        public static final String FULFILL_EXPORT = "FULFILL_EXPORT";
        public static final String CANCEL_EXPORT = "CANCEL_EXPORT";
        public static final String CREATE_STOCK_CHECK = "CREATE_STOCK_CHECK";
        public static final String START_STOCK_CHECK = "START_STOCK_CHECK";
        public static final String COMPLETE_STOCK_CHECK = "COMPLETE_STOCK_CHECK";
        public static final String APPROVE_STOCK_CHECK = "APPROVE_STOCK_CHECK";
        public static final String REJECT_STOCK_CHECK = "REJECT_STOCK_CHECK";
        public static final String CREATE_ADJUSTMENT = "CREATE_ADJUSTMENT";
        public static final String APPROVE_ADJUSTMENT = "APPROVE_ADJUSTMENT";
        public static final String REJECT_ADJUSTMENT = "REJECT_ADJUSTMENT";
        public static final String CREATE_WARRANTY = "CREATE_WARRANTY";
        public static final String RESOLVE_WARRANTY = "RESOLVE_WARRANTY";
        public static final String COMPLETE_WARRANTY = "COMPLETE_WARRANTY";
        public static final String CANCEL_WARRANTY = "CANCEL_WARRANTY";
        public static final String CREATE_PURCHASE_ORDER = "CREATE_PURCHASE_ORDER";
        public static final String CANCEL_PURCHASE_ORDER = "CANCEL_PURCHASE_ORDER";
        public static final String RECORD_STOCK_CHECK = "RECORD_STOCK_CHECK";
        public static final String CREATE_PRODUCT_IMAGE = "CREATE_PRODUCT_IMAGE";
        public static final String DELETE_PRODUCT_IMAGE = "DELETE_PRODUCT_IMAGE";
        public static final String CREATE_RETURN = "CREATE_RETURN";
        public static final String APPROVE_RETURN = "APPROVE_RETURN";
        public static final String CANCEL_RETURN = "CANCEL_RETURN";
    }

    public static class Entity {
        public static final String USER = "USER";
        public static final String BRAND = "BRAND";
        public static final String CATEGORY = "CATEGORY";
        public static final String SUPPLIER = "SUPPLIER";
        public static final String PRODUCT = "PRODUCT";
        public static final String IMPORT_RECEIPT = "IMPORT_RECEIPT";
        public static final String PRODUCT_UNIT = "PRODUCT_UNIT";
        public static final String LOCATION = "LOCATION";
        public static final String CUSTOMER = "CUSTOMER";
        public static final String EXPORT_RECEIPT = "EXPORT_RECEIPT";
        public static final String STOCK_CHECK = "STOCK_CHECK";
        public static final String STOCK_CHECK_ITEM = "STOCK_CHECK_ITEM";
        public static final String STOCK_ADJUSTMENT = "STOCK_ADJUSTMENT";
        public static final String WARRANTY_REQUEST = "WARRANTY_REQUEST";
        public static final String PURCHASE_ORDER = "PURCHASE_ORDER";
        public static final String PRODUCT_IMAGE = "PRODUCT_IMAGE";
        public static final String RETURN_RECEIPT = "RETURN_RECEIPT";
        public static final String PRICE_ADJUSTMENT = "PRICE_ADJUSTMENT";
    }

    public static class Status {
        public static final String SUCCESS = "SUCCESS";
        public static final String FAILED = "FAILED";
    }
}
