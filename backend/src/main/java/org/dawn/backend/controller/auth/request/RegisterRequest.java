package org.dawn.backend.controller.auth.request;

import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(@NotBlank String fullName, String email, @NotBlank String roleName, String status) {
}
