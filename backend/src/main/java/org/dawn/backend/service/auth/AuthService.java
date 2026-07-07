package org.dawn.backend.service.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.auth.request.ChangePasswordRequest;
import org.dawn.backend.controller.auth.request.ForgotPasswordRequest;
import org.dawn.backend.controller.auth.request.LoginRequest;
import org.dawn.backend.controller.auth.request.ResetPasswordTokenRequest;
import org.dawn.backend.controller.auth.response.JwtResponse;
import org.dawn.backend.controller.auth.response.TokenRefreshResponse;
import org.dawn.backend.entity.auth.PasswordResetToken;
import org.dawn.backend.entity.auth.RefreshToken;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.constant.shared.ActiveStatus;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.PermissionDeniedException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.PasswordResetTokenRepository;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.service.shared.MailService;
import org.dawn.backend.utils.JWTUtils;
import org.dawn.backend.utils.UserUtils;
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


    public JwtResponse login(LoginRequest req) {

        String identifier = req.username();

        User user = userRepository
                .findByUsername(req.username())
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USER_NOT_FOUND));
        log.info("Get username :{}", identifier);

        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new PermissionDeniedException(Message.Auth.INVALID_PASSWORD);
        }

        if (Boolean.TRUE.equals(user.getIsDeleted()) || !ActiveStatus.ACTIVE.name().equalsIgnoreCase(user.getStatus())) {
            throw new PermissionDeniedException(Message.User.USER_INACTIVE);
        }

        String jwt = jwtUtils.generateToken(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().getName().name());

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());
        return JwtResponse
                .builder()
                .userId(user.getId())
                .username(user.getUsername())
                .accessToken(jwt)
                .refreshToken(refreshToken.getToken())
                .isPasswordReset(Boolean.TRUE.equals(user.getIsPasswordReset()))
                .build();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RESET_PASSWORD, entity = LogConstant.Entity.USER, entityClass = User.class)
    public String resetPassword(Long id) {
        User user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USERNAME_NOT_FOUND));
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
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USERNAME_NOT_FOUND));
        if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new PermissionDeniedException(Message.User.PASSWORD_NOT_MATCH);
        }

        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new InvalidRequestException(Message.User.PASSWORD_NOT_MATCH);
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
            throw new InvalidRequestException(Message.User.EMAIL_NOT_EMPTY);
        }

        User user = userRepository
                .findByEmail(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.EMAIL_NOT_FOUND));

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
            throw new InvalidRequestException(Message.Common.INVALID_TOKEN);
        }
        if (!req.newPassword().equals(req.confirmPassword())) {
            throw new InvalidRequestException(Message.Common.PASSWORD_NOT_MATCH);
        }
        if (req.newPassword().length() < 6) {
            throw new InvalidRequestException(Message.Common.PASSWORD_TOO_SHORT);
        }

        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByToken(req.token())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Auth.TOKEN_INVALID_OR_EXPIRED));

        if (Boolean.TRUE.equals(resetToken.getUsed())) {
            throw new InvalidRequestException(Message.Auth.TOKEN_ALREADY_USED);
        }
        if (resetToken.getExpiryDate().isBefore(Instant.now())) {
            throw new InvalidRequestException(Message.Auth.TOKEN_EXPIRED);
        }

        User user = userRepository
                .findById(resetToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USER_NOT_FOUND));

        user.setPassword(passwordEncoder.encode(req.newPassword()));
        user.setIsPasswordReset(false);
        userRepository.save(user);

        passwordResetTokenRepository.markUsed(resetToken.getId());
        refreshTokenService.deleteByUserId(user.getId());
        return "Đặt lại mật khẩu thành công";
    }

    public TokenRefreshResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            throw new ResourceNotFoundException(Message.Auth.REFRESH_TOKEN_EXPIRED);
        }

        return refreshTokenService.findByToken(refreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String jwtCookie = jwtUtils.generateToken(
                            user.getId(),
                            user.getUsername(),
                            user.getEmail(),
                            user.getRole().getName().name());
                    return TokenRefreshResponse
                            .builder()
                            .accessToken(jwtCookie)
                            .build();
                })
                .orElseThrow(() -> new ResourceNotFoundException(Message.Auth.REFRESH_TOKEN_NOT_FOUND));
    }
}
