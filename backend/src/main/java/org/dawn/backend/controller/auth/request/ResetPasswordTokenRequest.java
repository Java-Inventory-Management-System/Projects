package org.dawn.backend.controller.auth.request;

public record ResetPasswordTokenRequest(String token, String newPassword, String confirmPassword) {
}
