package org.dawn.backend.config.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.service.auth.RefreshTokenService;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class SignOutHandler implements LogoutHandler {

    @Value("${app.jwtRefreshCookieName}")
    private String jwtRefreshToken;

    private final RefreshTokenService refreshTokenService;


    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, @Nullable Authentication authentication) {
        log.info("Delete refresh token for logout");

        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl user) {
            Long userId = user.getId();
            refreshTokenService.deleteByUserId(userId);
        }

        String cleanCookie = ResponseCookie
                .from(jwtRefreshToken, "")
                .path("/api/v1/auth/refresh-token")
                .httpOnly(true)
                .secure(true)
                .maxAge(0)
                .build()
                .toString();
        response.setHeader(HttpHeaders.SET_COOKIE, cleanCookie);
    }
}
