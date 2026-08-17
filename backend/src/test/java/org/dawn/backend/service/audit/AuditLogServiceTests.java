package org.dawn.backend.service.audit;

import org.dawn.backend.constant.enums.auth.URole;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.entity.auth.Role;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.entity.system.AuditLog;
import org.dawn.backend.repository.audit.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTests {

    @Mock
    AuditLogRepository repository;

    private AuditLogService service() {
        return new AuditLogService(repository);
    }

    @Test
    void savesRoleSnapshotAtWriteTime() {
        Role role = new Role();
        role.setName(URole.MANAGER);
        User user = new User();
        user.setUsername("manager");
        user.setRole(role);
        UserDetailsImpl principal = UserDetailsImpl.build(user);

        service().save(LogConstant.Action.APPROVE_IMPORT, LogConstant.Entity.IMPORT_RECEIPT, "5",
                principal, "127.0.0.1", "req-1",
                LogConstant.Status.SUCCESS, null, null, null, "manager approved import receipt", null);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(repository).save(captor.capture());
        assertEquals("MANAGER", captor.getValue().getRoleSnapshot());
        assertEquals("manager", captor.getValue().getUsername());
    }

    @Test
    void leavesRoleSnapshotNullWhenPrincipalHasNoRole() {
        UserDetailsImpl failed = UserDetailsImpl.builder().username("unknown").authorities(java.util.List.of()).build();

        service().save(LogConstant.Action.LOGIN_FAILED, LogConstant.Entity.USER, null,
                failed, "127.0.0.1", "req-2",
                LogConstant.Status.FAILED, "Invalid password", null, null, "login failed", null);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(repository).save(captor.capture());
        assertNull(captor.getValue().getRoleSnapshot());
    }

    @Test
    void savesMessageFieldsJsonAlongsideMessage() {
        UserDetailsImpl principal = UserDetailsImpl.builder().username("admin").authorities(java.util.List.of()).build();

        service().save(LogConstant.Action.UPDATE_PRODUCT, LogConstant.Entity.PRODUCT, "3",
                principal, "127.0.0.1", "req-3",
                LogConstant.Status.SUCCESS, null, null, null,
                "admin updated product #3 (status: PENDING → APPROVED)",
                "[\"status\"]");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(repository).save(captor.capture());
        assertEquals("[\"status\"]", captor.getValue().getMessageFields());
    }
}
