package org.dawn.backend.constant.shared;

import java.text.MessageFormat;

public class Message {
    private Message() {
    }

    public static String format(String template, Object... args) {
        return MessageFormat.format(template, args);
    }

    // Auth
    public static final class Auth {
        private Auth() {
        }

        public static final String INVALID_PASSWORD = "Invalid password";
        public static final String INVALID_TOKEN = "Invalid token";
        public static final String TOKEN_EXPIRED = "Token has expired";
        public static final String TOKEN_INVALID_OR_EXPIRED = "Token is invalid or expired";
        public static final String TOKEN_ALREADY_USED = "Token has already been used";
        public static final String REFRESH_TOKEN_NOT_FOUND = "Refresh token not found";
        public static final String UNAUTHORIZED = "Authentication required";
        public static final String FORBIDDEN = "You do not have permission to perform this action";
        public static final String USER_NOT_AUTHENTICATED = "User not authenticated";

        // Login
        public static final String INVALID_CREDENTIALS = "Invalid email or password";
        public static final String ACCOUNT_NOT_VERIFIED = "Account email has not been verified";
        public static final String ACCOUNT_NOT_ACTIVE = "Account is not active";
        public static final String REQUIRED_LOGIN = "Required login";

        // OTP / Resend
        public static final String OTP_RESEND_COOLDOWN = "Please wait 60 seconds before requesting a new code";

        // Password reset
        public static final String RESET_TOKEN_INVALID = "Invalid or expired reset token";

        // Refresh token
        public static final String REFRESH_TOKEN_INVALID = "Invalid or expired refresh token";
        public static final String REFRESH_TOKEN_REUSE_DETECTED = "Refresh token reuse detected";
        public static final String REFRESH_TOKEN_EXPIRED = "Refresh token has expired, please log in again";
    }

    // Common
    public static final class Common {
        private Common() {
        }

        public static final String VALIDATION_FAILED = "Request validation failed";
        public static final String ENDPOINT_NOT_FOUND = "API endpoint not found";
        public static final String INTERNAL_ERROR = "An unexpected error occurred";
        public static final String IMAGE_UPLOAD_FAILED = "Image upload failed";
        public static final String EMAIL_SEND_FAILED = "Failed to send email, please contact support";
        public static final String METHOD_NOT_IMPLEMENTED = "This feature is not yet implemented";
        public static final String INVALID_TOKEN = "Invalid token";
        public static final String PASSWORD_NOT_MATCH = "Passwords do not match";
        public static final String PASSWORD_TOO_SHORT = "Password must be at least 6 characters";
    }

    // Catalog
    public static final class Catalog {
        private Catalog() {
        }

        public static final String BRAND_NOT_FOUND = "Brand not found";
        public static final String BRAND_NAME_EXISTS = "Brand name already exists";
        public static final String BRAND_NAME_REQUIRED = "Brand name is required";
        public static final String CATEGORY_NOT_FOUND = "Category not found";
        public static final String CATEGORY_NAME_REQUIRED = "Category name is required";
        public static final String SUPPLIER_NOT_FOUND = "Supplier not found";
        public static final String SUPPLIER_NAME_REQUIRED = "Supplier name is required";
        public static final String PRODUCT_NOT_FOUND = "Product not found";
        public static final String PRODUCT_NAME_REQUIRED = "Product name is required";
        public static final String SKU_REQUIRED = "SKU is required";
        public static final String SKU_ALREADY_EXISTS = "SKU already exists";
        public static final String IMAGE_NOT_FOUND = "Image not found";
        public static final String INVALID_UNIT_TRACKING = "Product unit %s requires tracking_type = %s";
    }

    // Inventory
    public static final class Inventory {
        private Inventory() {}

        public static final String LOCATION_NOT_FOUND = "Location not found";
        public static final String LOCATION_CODE_EXISTS = "Location code already exists";
        public static final String LOCATION_CODE_REQUIRED = "Zone code, shelf code, and bin code are required";
        public static final String CANNOT_DELETE_LOCATION_WITH_UNITS = "Cannot delete location with {0} product unit(s)";
        public static final String CUSTOMER_NOT_FOUND = "Customer not found";
        public static final String IMPORT_RECEIPT_NOT_FOUND = "Import receipt not found";
        public static final String IMPORT_ITEM_NOT_FOUND = "Import receipt item not found";
        public static final String RECEIPT_CODE_EXISTS = "Receipt code already exists";
        public static final String PRODUCT_UNIT_NOT_FOUND = "Product unit not found";
        public static final String SERIAL_ALREADY_EXISTS = "Serial number already exists";
        public static final String SERIAL_ALREADY_EXISTS_LIST = "Serial already exists: {0}";
        public static final String SERIAL_COUNT_MUST_MATCH = "Serial count must match quantity";
        public static final String SERIAL_BLANK = "Serial number cannot be blank";
        public static final String IMPORT_ALREADY_COMPLETED = "Import receipt already completed";
        public static final String IMPORT_ALREADY_CANCELLED = "Import receipt already cancelled";
        public static final String IMPORT_CANNOT_CANCEL_UNITS_EXPORTED = "Cannot cancel: some units have been exported";
        public static final String CREATOR_CANNOT_APPROVE = "Creator cannot approve their own transaction";
        public static final String SERIAL_REQUIRED_FOR_SERIALIZED = "Serial number is required for serialized products";
        public static final String SERIAL_NOT_ALLOWED_FOR_BULK = "Serial number not allowed for bulk products";
        public static final String INVALID_UNIT_TRACKING = "Product unit %s requires tracking_type = %s";
        public static final String EXPORT_RECEIPT_NOT_FOUND = "Export receipt not found";
        public static final String EXPORT_ALREADY_CANCELLED = "Export receipt already cancelled";
        public static final String INSUFFICIENT_STOCK = "Insufficient stock for {0}: available {1}, needed {2}";
        public static final String AT_LEAST_ONE_ITEM_REQUIRED = "At least one item is required";
        public static final String EXPORT_REASON_REQUIRED = "Export reason is required";
        public static final String CUSTOMER_REQUIRED_FOR_SALE = "Customer is required for sale export";
        public static final String INVALID_EXPORT_REASON = "Invalid export reason: {0}";
        public static final String SUPPLIER_REQUIRED = "Supplier is required";
        public static final String ONLY_PENDING_APPROVAL_CAN_APPROVE = "Only pending approval receipts can be approved";
        public static final String STOCK_CHECK_NOT_FOUND = "Stock check not found";
        public static final String STOCK_CHECK_ALREADY_APPROVED = "Stock check already approved";
        public static final String STOCK_CHECK_ALREADY_REJECTED = "Stock check already rejected";
        public static final String STOCK_CHECK_ALREADY_COMPLETED = "Stock check already completed";
        public static final String STOCK_CHECK_ITEMS_REQUIRED = "At least one stock check item is required";
        public static final String STOCK_CHECK_MUST_BE_IN_PROGRESS = "Stock check must be in progress to record items";
        public static final String ONLY_COMPLETED_CAN_APPROVE = "Only completed stock checks can be approved";
        public static final String ONLY_COMPLETED_CAN_REJECT = "Only completed stock checks can be rejected";
        public static final String ADJUSTMENT_NOT_FOUND = "Stock adjustment not found";
        public static final String ADJUSTMENT_TYPE_REQUIRED = "Adjustment type is required";
        public static final String INVALID_ADJUSTMENT_TYPE = "Invalid adjustment type: {0}";
        public static final String ADJUSTMENT_REASON_REQUIRED = "Reason is required for adjustment";
        public static final String ADJUSTMENT_UNIT_REQUIRED = "Product unit is required for {0} adjustment";
        public static final String ADJUSTMENT_PRODUCT_REQUIRED = "Product is required for found adjustment without serial";
        public static final String ADJUSTMENT_ALREADY_APPROVED = "Adjustment already approved";
        public static final String ADJUSTMENT_ALREADY_REJECTED = "Adjustment already rejected";
        public static final String ONLY_PENDING_CAN_APPROVE = "Only pending adjustments can be approved";
        public static final String ONLY_PENDING_CAN_REJECT = "Only pending adjustments can be rejected";
        public static final String ADJUSTMENT_UNIT_NOT_RESTORABLE = "Product unit is in status {0} and cannot be restored via found adjustment";

        public static final String PO_NOT_FOUND = "Purchase order not found";
        public static final String PO_CODE_EXISTS = "Purchase order code already exists";
        public static final String PO_ALREADY_CANCELLED = "Purchase order already cancelled";
        public static final String PO_HAS_COMPLETED_RECEIPTS = "Cannot cancel purchase order with completed import receipts";

        public static final String WARRANTY_REQUEST_NOT_FOUND = "Warranty request not found";
        public static final String WARRANTY_SERIAL_REQUIRED = "Serial number is required for warranty lookup";
        public static final String WARRANTY_SERIAL_AMBIGUOUS = "Serial lookup is ambiguous; please enter the exact serial number";
        public static final String WARRANTY_SERIALIZED_ONLY = "Warranty requests are only supported for serialized products";
        public static final String WARRANTY_UNIT_NOT_SOLD = "Only sold product units can start a warranty request";
        public static final String WARRANTY_EXPIRED = "Product warranty has expired";
        public static final String WARRANTY_NOT_ACTIVATED = "Product warranty has not been activated";
        public static final String WARRANTY_ISSUE_REQUIRED = "Issue description is required";
        public static final String WARRANTY_ALREADY_PENDING = "This product unit already has a pending warranty request";
        public static final String WARRANTY_ONLY_PENDING = "Only pending warranty requests can be changed";
        public static final String WARRANTY_RESOLUTION_REQUIRED = "Warranty resolution type is required";
        public static final String WARRANTY_INVALID_RESOLUTION = "Invalid warranty resolution type: {0}";
        public static final String WARRANTY_RESOLUTION_ALREADY_SELECTED = "A resolution has already been selected for this warranty request";
        public static final String WARRANTY_REPLACEMENT_REQUIRED = "A replacement product unit is required";
        public static final String WARRANTY_REPLACEMENT_SAME_UNIT = "The replacement unit must differ from the original unit";
        public static final String WARRANTY_REPLACEMENT_PRODUCT_MISMATCH = "The replacement unit must be the same product";
        public static final String WARRANTY_REPLACEMENT_NOT_AVAILABLE = "The replacement unit is not available in stock";
        public static final String WARRANTY_RMA_NUMBER_REQUIRED = "RMA number is required";
        public static final String WARRANTY_REJECT_REASON_REQUIRED = "A rejection reason is required";
        public static final String WARRANTY_COMPLETION_RESULT_REQUIRED = "Warranty completion result is required";
        public static final String WARRANTY_INVALID_COMPLETION_RESULT = "Invalid warranty completion result: {0}";
        public static final String WARRANTY_CANNOT_COMPLETE = "Only repair or RMA warranty requests can be completed manually";
        public static final String WARRANTY_INVALID_UNIT_STATE = "Product unit cannot transition from {0} for this warranty action";
        public static final String WARRANTY_CANCEL_REASON_REQUIRED = "A cancellation reason is required";
    }

    // User
    public static final class User {
        private User() {
        }

        public static final String NOT_FOUND = "User not found";
        public static final String NOT_FOUND_WITH_ID = "User not found: {0}";
        public static final String EMAIL_NOT_FOUND = "No account found with this email";
        public static final String EMAIL_ALREADY_USED = "Email is already in use";
        public static final String EMAIL_INVALID_FORMAT = "Invalid email format";
        public static final String EMAIL_NOT_EMPTY = "Email cannot be empty";
        public static final String USERNAME_EXISTED = "Username already exists";
        public static final String USERNAME_NOT_FOUND = "Username not found";
        public static final String USER_EXISTED = "User already exists";
        public static final String USER_NOT_FOUND = "User not found";
        public static final String PASSWORD_NOT_MATCH = "Passwords do not match";
        public static final String PASSWORD_TOO_SHORT = "Password must be at least 8 characters";
        public static final String USER_INACTIVE = "Account is locked or not yet activated";
        public static final String USER_ALREADY_VERIFICATION = "Account has already been verified";
        public static final String CANNOT_UPDATE_YOURSELF = "You cannot update your own account this way";
        public static final String CANNOT_CHANGE_OWN_ROLE = "You cannot change your own role";
        public static final String CANNOT_ASSIGN_ADMIN_ROLE = "Admin role cannot be assigned via this API";
        public static final String ROLE_NOT_FOUND = "Role not found";
    }

}
