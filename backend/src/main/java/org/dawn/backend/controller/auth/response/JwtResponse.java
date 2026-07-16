package org.dawn.backend.controller.auth.response;

import lombok.Builder;

@Builder
public record JwtResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String username,
        String fullName,
        Boolean isPasswordReset) {
}
