package org.dawn.backend.controller.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.controller.auth.request.ChangePasswordRequest;
import org.dawn.backend.controller.auth.request.ForgotPasswordRequest;
import org.dawn.backend.controller.auth.request.LoginRequest;
import org.dawn.backend.controller.auth.request.ResetPasswordTokenRequest;
import org.dawn.backend.controller.auth.response.JwtResponse;
import org.dawn.backend.controller.auth.response.TokenRefreshResponse;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.service.auth.AuthService;
import org.dawn.backend.utils.JWTUtils;
import org.dawn.backend.utils.SecurityUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final JWTUtils jwtUtils;

    @PostMapping("/login")
    public ResponseObject<JwtResponse> login(@RequestBody LoginRequest loginReq, HttpServletResponse res) {
        JwtResponse jwt = authService.login(loginReq);
        Cookie refreshToken = jwtUtils.generateJwtRefreshCookie(jwt.refreshToken());
        res.addCookie(refreshToken);
        return ResponseObject.success(jwt);
    }


    @PostMapping("/refresh-token")
    public ResponseObject<TokenRefreshResponse> refreshToken(@CookieValue(name = "${app.jwtRefreshCookieName}") String refreshToken) {
        log.info("Refresh token received: {}", (refreshToken != null ? "present" : "null"));
        return ResponseObject.success(authService.refreshToken(refreshToken));

    }

    @PreAuthorize("@roleSecurity.canUpdate(#id, authentication)")
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
    public ResponseObject<String> changePassword(@RequestBody ChangePasswordRequest changeReq) {
        UserDetailsImpl currentUser = SecurityUtils.getCurrentUser();
        String message = authService.changePassword(currentUser.getUsername(), changeReq);
        return ResponseObject.success(message);
    }
}
