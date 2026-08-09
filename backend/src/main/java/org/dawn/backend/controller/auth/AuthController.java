package org.dawn.backend.controller.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditMessageBuilder;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.auth.request.ChangePasswordRequest;
import org.dawn.backend.controller.auth.request.ForgotPasswordRequest;
import org.dawn.backend.controller.auth.request.LoginRequest;
import org.dawn.backend.controller.auth.request.ResetPasswordTokenRequest;
import org.dawn.backend.controller.auth.response.JwtResponse;
import org.dawn.backend.controller.auth.response.TokenRefreshResponse;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.service.audit.AuditLogService;
import org.dawn.backend.service.auth.AuthService;
import org.dawn.backend.shared.util.JWTUtils;
import org.dawn.backend.shared.util.SecurityUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final JWTUtils jwtUtils;
    private final AuditLogService auditLogService;
    private final AuditMessageBuilder messageBuilder;

    @PostMapping("/login")
    public ResponseObject<JwtResponse> login(@Valid @RequestBody LoginRequest loginReq) {
        AuthService.LoginResult result = authService.login(loginReq);
        return ResponseObject.success(result.response(),
                jwtUtils.generateJwtRefreshCookie(result.refreshToken()));
    }

    @PostMapping("/refresh-token")
    public ResponseObject<TokenRefreshResponse> refreshToken(
            @CookieValue(name = "${app.jwtRefreshCookieName}") String refreshToken) {
        log.info("Refresh token received: {}", (refreshToken != null ? "present" : "null"));
        AuthService.RefreshResult result = authService.refreshToken(refreshToken);
        return ResponseObject.success(result.response(),
                jwtUtils.generateJwtRefreshCookie(result.newRefreshToken()));
    }

    @PostMapping("/logout")
    public ResponseObject<String> logout(
            @CookieValue(name = "${app.jwtRefreshCookieName}", required = false) String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        UserDetailsImpl user = SecurityUtils.getCurrentUser();
        String entityId = user != null ? user.getId().toString() : null;
        AuditMessageBuilder.MessageResult mr = messageBuilder.build(user != null ? user.getUsername() : null,
                LogConstant.Action.LOGOUT, LogConstant.Entity.USER, entityId,
                null, null, LogConstant.Status.SUCCESS, null);
        auditLogService.save(LogConstant.Action.LOGOUT, LogConstant.Entity.USER, entityId,
                user, AuditLogService.clientIp(), UUID.randomUUID().toString().replace("-", ""),
                LogConstant.Status.SUCCESS, null, null, null,
                mr.message(), toJson(mr.messageFields()));
        return ResponseObject.success("Logged out",
                jwtUtils.generateCleanJwtRefreshCookie());
    }

    private static String toJson(Object value) {
        if (value == null) return null;
        try {
            return new ObjectMapper().writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    @PreAuthorize(AuthorizationExpressions.CAN_UPDATE_USER)
    @PutMapping("/{id}/reset-password")
    public ResponseObject<String> resetPassword(@PathVariable Long id) {
        return ResponseObject.success(authService.resetPassword(id));
    }

    @PostMapping("/forgot-password")
    public ResponseObject<String> forgotPassword(@RequestBody ForgotPasswordRequest forgotReq) {
        return ResponseObject.success(authService.forgotPassword(forgotReq));
    }

    @PostMapping("/reset-password")
    public ResponseObject<String> resetPasswordByToken(@RequestBody ResetPasswordTokenRequest resetReq) {
        return ResponseObject.success(authService.resetPasswordByToken(resetReq));
    }

    @PutMapping("/change-password")
    @PreAuthorize(AuthorizationExpressions.IS_AUTHENTICATED)
    public ResponseObject<String> changePassword(@RequestBody ChangePasswordRequest changeReq) {
        UserDetailsImpl currentUser = SecurityUtils.getCurrentUser();
        String message = authService.changePassword(currentUser.getUsername(), changeReq);
        return ResponseObject.success(message);
    }
}
