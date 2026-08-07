package org.dawn.backend.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.service.audit.AuditLogService;
import org.dawn.backend.shared.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogAspectTests {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Mock
    AuditLogService auditLogService;
    @Mock
    EntityManager entityManager;
    @Mock
    ProceedingJoinPoint joinPoint;
    @Mock
    MethodSignature signature;
    @Mock
    org.dawn.backend.aspect.AuditLog auditLog;

    private AuditLogAspect aspect;

    static class IdCarrier {
        private final long id;

        IdCarrier(long id) {
            this.id = id;
        }

        public long getId() {
            return id;
        }
    }

    private void setUpAspect() {
        AuditSnapshotMapperRegistry registry = new AuditSnapshotMapperRegistry();
        registry.register();
        aspect = new AuditLogAspect(auditLogService, entityManager, MAPPER, new AuditMessageBuilder(MAPPER), registry);
    }

    private void stubJoinPoint(String[] paramNames, Object[] args) throws Throwable {
        when(signature.getParameterNames()).thenReturn(paramNames);
        when(joinPoint.getSignature()).thenReturn(signature);
        when(joinPoint.getArgs()).thenReturn(args);
        when(joinPoint.proceed()).thenReturn(null);
        when(auditLog.action()).thenReturn("CREATE_IMPORT");
        when(auditLog.entity()).thenReturn("IMPORT_RECEIPT");
        when(auditLog.entityClass()).thenAnswer(inv -> void.class);
    }

    private void runLogExecution() throws Throwable {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::getCurrentUser).thenReturn(null);
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(null);
            aspect.logExecution(joinPoint, auditLog);
        }
    }

    private void verifySavedEntityId(String expected) {
        verify(auditLogService).save(eq("CREATE_IMPORT"), eq("IMPORT_RECEIPT"), eq(expected),
                isNull(), anyString(), anyString(), eq(LogConstant.Status.SUCCESS),
                isNull(), isNull(), isNull(), anyString(), anyString());
    }

    @Test
    void resolvesIdFromParamNamedId() throws Throwable {
        setUpAspect();
        stubJoinPoint(new String[]{"id"}, new Object[]{5L});
        runLogExecution();
        verifySavedEntityId("5");
    }

    @Test
    void resolvesIdFromEntitySpecificParam() throws Throwable {
        setUpAspect();
        stubJoinPoint(new String[]{"stockCheckId", "unitIds"}, new Object[]{10L, List.of(1L, 2L)});
        runLogExecution();
        verifySavedEntityId("10");
    }

    @Test
    void joinsCollectionIdParam() throws Throwable {
        setUpAspect();
        stubJoinPoint(new String[]{"unitIds"}, new Object[]{List.of(1L, 2L)});
        runLogExecution();
        verifySavedEntityId("1,2");
    }

    @Test
    void resolvesIdFromArgObject() throws Throwable {
        setUpAspect();
        stubJoinPoint(new String[]{"request"}, new Object[]{new IdCarrier(7)});
        runLogExecution();
        verifySavedEntityId("7");
    }

    @Test
    void fallsBackToEmptyWhenNoIdFound() throws Throwable {
        setUpAspect();
        stubJoinPoint(new String[]{"qty"}, new Object[]{3});
        runLogExecution();
        verifySavedEntityId("");
    }

    @Test
    void capturesOldValueWithoutPasswordField() throws Throwable {
        setUpAspect();
        org.dawn.backend.entity.auth.Role role = new org.dawn.backend.entity.auth.Role();
        role.setName(org.dawn.backend.constant.enums.auth.URole.ADMIN);
        User user = new User();
        user.setUsername("admin");
        user.setPassword("hash-123");
        user.setRole(role);
        user.setStatus(org.dawn.backend.constant.enums.shared.ActiveStatus.ACTIVE);
        stubJoinPoint(new String[]{"id"}, new Object[]{5L});
        when(auditLog.entityClass()).thenAnswer(inv -> User.class);
        when(entityManager.find(User.class, 5L)).thenReturn(user);

        runLogExecution();

        verify(auditLogService).save(eq("CREATE_IMPORT"), eq("IMPORT_RECEIPT"), eq("5"),
                isNull(), anyString(), anyString(), eq(LogConstant.Status.SUCCESS),
                isNull(), anyString(), isNull(), anyString(), anyString());
    }

    @Test
    void buildsMessageWithCode() {
        AuditMessageBuilder builder = new AuditMessageBuilder(MAPPER);
        String message = builder.build("admin", "CREATE_IMPORT", "IMPORT_RECEIPT", "5",
                "{\"status\":\"DRAFT\"}", "{\"receiptCode\":\"NH-2026-001\",\"status\":\"DRAFT\"}",
                LogConstant.Status.SUCCESS, null).message();
        assertEquals("admin created import receipt NH-2026-001", message);
    }

    @Test
    void buildsMessageWithStatusDiff() {
        AuditMessageBuilder builder = new AuditMessageBuilder(MAPPER);
        AuditMessageBuilder.MessageResult result = builder.build("manager", "APPROVE_ADJUSTMENT", "STOCK_ADJUSTMENT", "15",
                "{\"status\":\"PENDING\"}", "{\"adjustCode\":\"ADJ-2026-015\",\"status\":\"APPROVED\"}",
                LogConstant.Status.SUCCESS, null);
        assertEquals("manager approved stock adjustment ADJ-2026-015 (Status: PENDING \u2192 APPROVED)", result.message());
        assertEquals(java.util.List.of("status"), result.messageFields());
    }

    @Test
    void buildsFailedMessageWithError() {
        AuditMessageBuilder builder = new AuditMessageBuilder(MAPPER);
        String message = builder.build(null, "APPROVE_IMPORT", "IMPORT_RECEIPT", "5",
                "{\"status\":\"PENDING\"}", "{\"receiptCode\":\"NH-2026-001\"}",
                LogConstant.Status.FAILED, "Quantity exceeds available stock").message();
        assertEquals("approve import receipt NH-2026-001 failed: Quantity exceeds available stock", message);
    }

    @Test
    void buildsAuthMessages() {
        AuditMessageBuilder builder = new AuditMessageBuilder(MAPPER);
        assertEquals("admin logged in",
                builder.build("admin", "LOGIN_SUCCESS", "USER", "1", null, null, LogConstant.Status.SUCCESS, null).message());
        assertEquals("login failed: Invalid password",
                builder.build(null, "LOGIN_FAILED", "USER", null, null, null, LogConstant.Status.FAILED, "Invalid password").message());
        assertEquals("admin logged out",
                builder.build("admin", "LOGOUT", "USER", "1", null, null, LogConstant.Status.SUCCESS, null).message());
    }

    @Test
    void sanitizeRemovesSensitiveFields() {
        AuditMessageBuilder builder = new AuditMessageBuilder(MAPPER);
        String cleaned = builder.sanitize("{\"password\":\"x\",\"fullName\":\"a\",\"request\":{\"token\":\"y\"},\"refreshToken\":\"z\"}");
        assertFalse(cleaned.contains("password"));
        assertFalse(cleaned.contains("token"));
        assertTrue(cleaned.contains("fullName"));
    }

    @Test
    void diffSuffixLimitsToThreeFieldsAndPrefersStatus() {
        AuditMessageBuilder builder = new AuditMessageBuilder(MAPPER);
        String diff = builder.build("admin", "UPDATE_PRODUCT", "PRODUCT", "1",
                "{\"status\":\"DRAFT\",\"a\":\"1\",\"b\":\"2\",\"c\":\"3\",\"d\":\"4\"}",
                "{\"status\":\"PENDING\",\"a\":\"1\",\"b\":\"9\",\"c\":\"8\",\"d\":\"7\"}",
                LogConstant.Status.SUCCESS, null).message();
        assertTrue(diff.contains("(Status: DRAFT \u2192 PENDING, B: 2 \u2192 9, C: 3 \u2192 8)"), diff);
    }

    @Test
    void diffSuffixSkipsSensitiveFields() {
        AuditMessageBuilder builder = new AuditMessageBuilder(MAPPER);
        String diff = builder.build("admin", "UPDATE_PRODUCT", "PRODUCT", "1",
                "{\"status\":\"PENDING\",\"password\":\"a\"}",
                "{\"status\":\"APPROVED\",\"password\":\"b\"}",
                LogConstant.Status.SUCCESS, null).message();
        assertTrue(diff.contains("(Status: PENDING \u2192 APPROVED)"), diff);
        assertFalse(diff.contains("password"), diff);
    }

    @Test
    void diffSuffixEmptyForCreate() {
        AuditMessageBuilder builder = new AuditMessageBuilder(MAPPER);
        String diff = builder.build("admin", "CREATE_IMPORT", "IMPORT_RECEIPT", "5",
                null, "{\"status\":\"PENDING\"}",
                LogConstant.Status.SUCCESS, null).message();
        assertFalse(diff.contains("("), diff);
    }
}
