package org.dawn.backend.service.auth;

import org.dawn.backend.controller.auth.response.UserResponse;
import org.dawn.backend.entity.auth.User;

public interface UserMappingHelper {

    static UserResponse map(final User u) {
        return UserResponse
                .builder()
                .id(u.getId())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .role(u.getRole().getName().name())
                .status(u.getStatus().name())
                .gender(u.getGender())
                .dob(u.getDob())
                .phoneNumber(u.getPhoneNumber())
                .lastLogin(u.getLastLogin())
                .isPasswordReset(u.getIsPasswordReset())
                .isDeleted(u.getIsDeleted())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
