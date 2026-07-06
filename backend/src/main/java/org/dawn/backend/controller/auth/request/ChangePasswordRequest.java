package org.dawn.backend.controller.auth.request;

public record ChangePasswordRequest(String oldPassword, String newPassword, String confirmPassword) {
}
