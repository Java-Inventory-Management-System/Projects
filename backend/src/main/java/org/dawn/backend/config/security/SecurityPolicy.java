package org.dawn.backend.config.security;

import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.PermissionDeniedException;
import org.dawn.backend.shared.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("securityPolicy")
public class SecurityPolicy {

    private static boolean ENABLED = true;

    @Value("${app.security.enabled:true}")
    public void setEnabled(boolean enabled) {
        SecurityPolicy.ENABLED = enabled;
    }

    public static boolean isEnabled() {
        return ENABLED;
    }

    // ─── @PreAuthorize support ────────────────────────────────────────
    public boolean hasRole(String role) {
        if (!ENABLED) return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_" + role));
    }

    public boolean hasAnyRole(String... roles) {
        if (!ENABLED) return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        var authorities = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        for (String role : roles) {
            if (authorities.contains("ROLE_" + role)) return true;
        }
        return false;
    }

    public boolean canUpdate(Long userId, Authentication auth) {
        if (!ENABLED) return true;
        UserDetailsImpl currentUser = (UserDetailsImpl) auth.getPrincipal();
        if (currentUser.getId().equals(userId)) {
            throw new PermissionDeniedException(Message.Auth.FORBIDDEN);
        }
        return true;
    }

    // ─── Service-layer business checks ────────────────────────────────
    public Long requireAuthenticated() {
        if (!ENABLED) return 1L;
        Long uid = SecurityUtils.getCurrentUserId();
        if (uid == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);
        return uid;
    }

    public void requireNotCreator(Long creatorId) {
        if (!ENABLED || creatorId == null) return;
        Long currentId = SecurityUtils.getCurrentUserId();
        if (creatorId.equals(currentId))
            throw new PermissionDeniedException(Message.Auth.FORBIDDEN);
    }

    public void requireOwner(Long creatorId) {
        if (!ENABLED || creatorId == null) return;
        Long currentId = SecurityUtils.getCurrentUserId();
        if (!creatorId.equals(currentId))
            throw new PermissionDeniedException(Message.Auth.FORBIDDEN);
    }

    public void requireNotSelf(Long targetId) {
        if (!ENABLED || targetId == null) return;
        if (targetId.equals(SecurityUtils.getCurrentUserId()))
            throw new InvalidRequestException(Message.User.CANNOT_UPDATE_YOURSELF);
    }

    public boolean isAdminOrManager() {
        if (!ENABLED) return true;
        String role = SecurityUtils.getCurrentRole();
        return "MANAGER".equals(role) || "ADMIN".equals(role);
    }

    public void requireAdminOrManagerOrOwner(Long creatorId) {
        if (!ENABLED) return;
        if (!isAdminOrManager() && !creatorId.equals(SecurityUtils.getCurrentUserId()))
            throw new PermissionDeniedException(Message.Auth.FORBIDDEN);
    }
}
