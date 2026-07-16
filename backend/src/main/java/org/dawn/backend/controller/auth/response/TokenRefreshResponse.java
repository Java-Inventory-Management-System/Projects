package org.dawn.backend.controller.auth.response;


import lombok.Builder;

@Builder
public record TokenRefreshResponse(
        String accessToken,
        Long userId,
        String username,
        String fullName,
        String role,
        Boolean isPasswordReset) {
}
