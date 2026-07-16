package org.dawn.backend.controller.auth.response;


import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Builder;

@Builder
public record TokenRefreshResponse(
        String accessToken,
        @JsonIgnore String refreshToken,
        Long userId,
        String username,
        String fullName,
        String role,
        Boolean isPasswordReset) {
}
