package org.dawn.backend.utils;

import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {
    public static UserDetailsImpl getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails;
        }
        return null;
    }

    public static Long getCurrentUserId() {
        UserDetailsImpl user = getCurrentUser();
        return user != null ? user.getId() : null;
    }

    public static String getCurrentUsername() {
        UserDetailsImpl user = getCurrentUser();
        return user != null ? user.getUsername() : null;
    }

    public static String getCurrentRole() {
        UserDetailsImpl user = getCurrentUser();
        return user != null && user.getRole() != null ? user.getRole().name() : null;
    }

    public static String getCurrentEmail() {
        UserDetailsImpl user = getCurrentUser();
        return user != null ? user.getEmail() : null;
    }
}
