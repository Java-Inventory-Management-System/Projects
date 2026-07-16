package org.dawn.backend.controller.auth.response;

import lombok.Builder;

@Builder
public record JwtResponse(
        String accessToken,
        Long userId,
        String username,
        String fullName,
        Boolean isPasswordReset) {
}
