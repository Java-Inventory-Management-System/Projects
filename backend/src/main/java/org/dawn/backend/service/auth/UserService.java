package org.dawn.backend.service.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.auth.URole;
import org.dawn.backend.constant.enums.shared.ActiveStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.auth.request.RegisterRequest;
import org.dawn.backend.controller.auth.request.UpdateInfoRequest;
import org.dawn.backend.controller.auth.response.CreateUserResponse;
import org.dawn.backend.controller.auth.response.UserResponse;
import org.dawn.backend.entity.auth.Role;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.PermissionDeniedException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.RoleRepository;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.shared.util.UserUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityPolicy securityPolicy;

    @Transactional(readOnly = true)
    public ResponsePage<UserResponse> findAll(Pageable pageable) {
        return ResponsePage.of(userRepository
                .findAll(pageable)
                .map(UserMappingHelper::map));
    }

    @Transactional(readOnly = true)
    public UserResponse findOne(Long id) {
        return userRepository
                .findById(id)
                .map(UserMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USER_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public UserResponse findByUsername(String username) {
        return userRepository
                .findByUsername(username)
                .map(UserMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USER_NOT_FOUND));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_USER, entity = LogConstant.Entity.USER)
    public CreateUserResponse createUser(RegisterRequest request) {
        if (URole.ADMIN.name().equalsIgnoreCase(request.roleName())) {
            throw new PermissionDeniedException(Message.User.CANNOT_ASSIGN_ADMIN_ROLE);
        }

        String email = request.email();
        if (email != null) {
            email = email.trim();
            if (email.isEmpty()) {
                email = null;
            } else {
                if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                    throw new InvalidRequestException(Message.User.EMAIL_INVALID_FORMAT);
                }
                if (userRepository.findByEmail(email).isPresent()) {
                    throw new ResourceAlreadyExistedException(Message.User.EMAIL_ALREADY_USED);
                }
            }
        }

        String baseUsername = UserUtils.getBaseUsername(request.fullName());

        String finalUsername = baseUsername;

        int counter = 1;

        while (userRepository.existsByUsername(finalUsername)) {
            finalUsername = baseUsername + counter;
            counter++;
        }


        String tempPass = UserUtils.generateTempPassword();

        Role role = roleRepository
                .findByName(URole.valueOf(request.roleName()))
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.ROLE_NOT_FOUND));

        User user = User.builder()
                .username(finalUsername)
                .fullName(request.fullName())
                .email(email)
                .password(passwordEncoder.encode(tempPass))
                .status(request.status() != null ? ActiveStatus.valueOf(request.status()) : ActiveStatus.NEW)
                .roleId(role.getId())
                .role(role)
                .isPasswordReset(true)
                .build();
        User savedUser = userRepository.save(user);

        UserResponse base = UserMappingHelper.map(savedUser);
        return CreateUserResponse.builder()
                .id(base.id())
                .username(base.username())
                .fullName(base.fullName())
                .email(base.email())
                .role(base.role())
                .status(base.status())
                .gender(base.gender())
                .dob(base.dob())
                .phoneNumber(base.phoneNumber())
                .isPasswordReset(base.isPasswordReset())
                .isDeleted(base.isDeleted())
                .createdAt(base.createdAt())
                .updatedAt(base.updatedAt())
                .tempPassword(tempPass)
                .build();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_STATUS, entity = LogConstant.Entity.USER, entityClass = User.class)
    public UserResponse updateStatus(Long id, Boolean status) {
        if (Objects.equals(id, securityPolicy.requireAuthenticated())) {
            throw new PermissionDeniedException(Message.User.CANNOT_UPDATE_YOURSELF);
        }

        User user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USERNAME_NOT_FOUND));
        user.setIsDeleted(!status);
        User savedUser = userRepository.save(user);
        return UserMappingHelper.map(savedUser);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_INFO, entity = LogConstant.Entity.USER, entityClass = User.class)
    public UserResponse updateInfo(Long id, UpdateInfoRequest request) {
        User user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USERNAME_NOT_FOUND));

        if (request.fullName() != null) {
            user.setFullName(request.fullName());
        }
        if (request.gender() != null) {
            user.setGender(request.gender());
        }
        if (request.dob() != null) {
            user.setDob(request.dob());
        }
        if (request.phoneNumber() != null) {
            String phone = request.phoneNumber().trim();
            user.setPhoneNumber(phone.isEmpty() ? null : phone);
        }
        User savedUser = userRepository.save(user);
        return UserMappingHelper.map(savedUser);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_ROLE, entity = LogConstant.Entity.USER, entityClass = User.class)
    public UserResponse updateRole(Long id, URole roleName) {
        if (Objects.equals(id, securityPolicy.requireAuthenticated())) {
            throw new PermissionDeniedException(Message.User.CANNOT_CHANGE_OWN_ROLE);
        }

        if (URole.ADMIN.equals(roleName)) {
            throw new PermissionDeniedException(Message.User.CANNOT_ASSIGN_ADMIN_ROLE);
        }

        User user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.USERNAME_NOT_FOUND));

        Role role = roleRepository.findByName(roleName).orElseThrow(() -> new ResourceNotFoundException(Message.User.ROLE_NOT_FOUND));
        user.setRoleId(role.getId());

        User savedUser = userRepository.save(user);
        return UserMappingHelper.map(savedUser);
    }

    @Transactional(readOnly = true)
    public boolean existsByRoleName(String roleName) {
        Role role = roleRepository
                .findByName(URole.valueOf(roleName))
                .orElseThrow(() -> new ResourceNotFoundException(Message.User.ROLE_NOT_FOUND));

        return userRepository.existsByRole_Name(role.getName().name());
    }
}
