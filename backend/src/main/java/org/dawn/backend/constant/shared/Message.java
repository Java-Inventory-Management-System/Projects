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
        public static final String CATEGORY_NOT_FOUND = "Category not found";
        public static final String SUPPLIER_NOT_FOUND = "Supplier not found";
        public static final String PRODUCT_NOT_FOUND = "Product not found";
        public static final String SKU_ALREADY_EXISTS = "SKU already exists";
        public static final String IMAGE_NOT_FOUND = "Image not found";
        public static final String INVALID_UNIT_TRACKING = "Product unit %s requires tracking_type = %s";
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
