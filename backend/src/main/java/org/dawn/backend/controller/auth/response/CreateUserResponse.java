package org.dawn.backend.controller.auth.response;

import java.time.Instant;

import lombok.Builder;

@Builder
public record CreateUserResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String role,
        String status,
        Integer gender,
        Instant dob,
        String phoneNumber,
        Boolean isPasswordReset,
        Boolean isDeleted,
        Instant createdAt,
        Instant updatedAt,
        String tempPassword) {
}
