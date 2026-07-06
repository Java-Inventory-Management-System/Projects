package org.dawn.backend.controller.auth.request;

public record RegisterRequest(String fullName, String email, String roleName, String status) {
}
