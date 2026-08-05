package org.dawn.backend.config.security;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.exception.type.PermissionDeniedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("roleSecurity")
@RequiredArgsConstructor
public class UserRoleSecurity {

    private final UserRepository userRepository;

    public boolean canUpdate(Long userId, Authentication auth) {
        UserDetailsImpl currentUser = (UserDetailsImpl) auth.getPrincipal();
        //  Can not update youself
        if (currentUser.getId().equals(userId)) {
            throw new PermissionDeniedException(ErrorCode.FORBIDDEN);
        }
        User targetUser = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));
        int currentUserRole = currentUser.getRole().getLevel();
        int targetUserRole = targetUser.getRole().getName().getLevel();
        if (currentUserRole >= targetUserRole) {
            throw new PermissionDeniedException(ErrorCode.FORBIDDEN);
        }
        return true;
    }
}
