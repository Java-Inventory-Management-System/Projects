package org.dawn.backend.service.auth;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.auth.request.ChangePasswordRequest;
import org.dawn.backend.controller.auth.request.ForgotPasswordRequest;
import org.dawn.backend.controller.auth.request.LoginRequest;
import org.dawn.backend.controller.auth.request.ResetPasswordTokenRequest;
import org.dawn.backend.controller.auth.response.JwtResponse;
import org.dawn.backend.controller.auth.response.TokenRefreshResponse;
import org.dawn.backend.entity.auth.PasswordResetToken;
import org.dawn.backend.entity.auth.RefreshToken;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.constant.enums.shared.ActiveStatus;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.PermissionDeniedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.PasswordResetTokenRepository;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.service.system.MailService;
import org.dawn.backend.shared.util.JWTUtils;
import org.dawn.backend.shared.util.UserUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    @Value("${app.frontendUrl}")
    String frontendUrl;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JWTUtils jwtUtils;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final MailService mailService;

    public record LoginResult(JwtResponse response, String refreshToken) {}

    public LoginResult login(LoginRequest req) {

        String identifier = req.username();

        User user = userRepository
                .findByUsername(req.username())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));
        log.info("Get username :{}", identifier);

        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new PermissionDeniedException(ErrorCode.INVALID_PASSWORD);
        }

        if (Boolean.TRUE.equals(user.getIsDeleted()) || ActiveStatus.ACTIVE != user.getStatus()) {
            throw new PermissionDeniedException(ErrorCode.USER_INACTIVE);
        }

        String jwt = jwtUtils.generateToken(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().getName().name(),
                user.getFullName());

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());
        JwtResponse response = JwtResponse
                .builder()
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .accessToken(jwt)
                .isPasswordReset(Boolean.TRUE.equals(user.getIsPasswordReset()))
                .build();
        return new LoginResult(response, refreshToken.getToken());
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RESET_PASSWORD, entity = LogConstant.Entity.USER, entityClass = User.class)
    public String resetPassword(Long id) {
        User user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USERNAME_NOT_FOUND));
        String tempPwd = UserUtils.generateTempPassword();

        user.setPassword(passwordEncoder.encode(tempPwd));
        user.setIsPasswordReset(true);
        userRepository.save(user);

        refreshTokenService.deleteByUserId(id);
        return tempPwd;
    }

    @AuditLog(action = LogConstant.Action.CHANGE_PASSWORD, entity = LogConstant.Entity.USER)
    public String changePassword(String username, ChangePasswordRequest request) {
        log.info("Get username from change password: {}", username);
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USERNAME_NOT_FOUND));
        if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new PermissionDeniedException(ErrorCode.PASSWORD_NOT_MATCH);
        }

        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new InvalidRequestException(ErrorCode.PASSWORD_NOT_MATCH);
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));

        user.setIsPasswordReset(false);
        userRepository.save(user);
        return "Change password success";
    }

    @AuditLog(action = LogConstant.Action.RESET_PASSWORD, entity = LogConstant.Entity.USER)
    public String forgotPassword(ForgotPasswordRequest req) {
        String email = req.email();
        if (email == null || email.isBlank()) {
            throw new InvalidRequestException(ErrorCode.EMAIL_NOT_EMPTY);
        }

        User user = userRepository
                .findByEmail(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.EMAIL_NOT_FOUND));

        passwordResetTokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        Instant expiry = Instant.now().plus(15, ChronoUnit.MINUTES);
        passwordResetTokenRepository.save(PasswordResetToken.builder()
                .userId(user.getId())
                .token(token)
                .expiryDate(expiry)
                .build());


        if (frontendUrl == null || frontendUrl.isBlank()) frontendUrl = "http://localhost:5173";
        String resetLink = frontendUrl + "/reset-password?token=" + token;

        mailService.sendPasswordResetMail(email.trim(), user.getFullName(), resetLink);
        return "Email đặt lại mật khẩu đã được gửi";
    }

    @AuditLog(action = LogConstant.Action.RESET_PASSWORD, entity = LogConstant.Entity.USER)
    public String resetPasswordByToken(ResetPasswordTokenRequest req) {
        if (req.token() == null || req.token().isBlank()) {
            throw new InvalidRequestException(ErrorCode.INVALID_TOKEN);
        }
        if (!req.newPassword().equals(req.confirmPassword())) {
            throw new InvalidRequestException(ErrorCode.PASSWORD_NOT_MATCH);
        }
        if (req.newPassword().length() < 6) {
            throw new InvalidRequestException(ErrorCode.PASSWORD_TOO_SHORT);
        }

        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByToken(req.token())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TOKEN_INVALID_OR_EXPIRED));

        if (Boolean.TRUE.equals(resetToken.getUsed())) {
            throw new InvalidRequestException(ErrorCode.TOKEN_ALREADY_USED);
        }
        if (resetToken.getExpiryDate().isBefore(Instant.now())) {
            throw new InvalidRequestException(ErrorCode.TOKEN_EXPIRED);
        }

        User user = userRepository
                .findById(resetToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));

        user.setPassword(passwordEncoder.encode(req.newPassword()));
        user.setIsPasswordReset(false);
        userRepository.save(user);

        passwordResetTokenRepository.markUsed(resetToken.getId());
        refreshTokenService.deleteByUserId(user.getId());
        return "Đặt lại mật khẩu thành công";
    }

    public record RefreshResult(TokenRefreshResponse response, String newRefreshToken) {}

    public RefreshResult refreshToken(String refreshTokenValue) {
        if (refreshTokenValue == null || refreshTokenValue.isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        RefreshToken oldToken = refreshTokenService.findByToken(refreshTokenValue)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));
        refreshTokenService.verifyExpiration(oldToken);

        User user = oldToken.getUser();
        String accessToken = jwtUtils.generateToken(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().getName().name(),
                user.getFullName());

        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user.getId());

        TokenRefreshResponse response = TokenRefreshResponse
                .builder()
                .accessToken(accessToken)
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().getName().name())
                .isPasswordReset(Boolean.TRUE.equals(user.getIsPasswordReset()))
                .build();

        return new RefreshResult(response, newRefreshToken.getToken());
    }

    public void logout(String refreshTokenValue) {
        refreshTokenService.deleteByToken(refreshTokenValue);
    }
}
