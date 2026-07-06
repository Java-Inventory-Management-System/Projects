package org.dawn.backend.aspect;

import tools.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.service.audit.AuditLogService;
import org.dawn.backend.utils.SecurityUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogAspect {

    private final AuditLogService auditLogService;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    @Around("@annotation(auditLog)")
    public Object logExecution(ProceedingJoinPoint joinPoint, AuditLog auditLog) throws Throwable {
        UserDetailsImpl user = SecurityUtils.getCurrentUser();
        String ip = getClientIp();
        String requestId = UUID.randomUUID().toString().replace("-", "");

        String oldValue = captureOldValue(auditLog.entityClass(), joinPoint);
        String entityId = resolveParamId(joinPoint);

        try {
            Object result = joinPoint.proceed();
            if (entityId == null || entityId.isEmpty()) {
                entityId = resolveResultId(result);
            }
            String newValue = serializeResult(result);
            auditLogService.save(auditLog.action(), auditLog.entity(), entityId,
                    user, ip, requestId, LogConstant.Status.SUCCESS, null,
                    oldValue, newValue);
            return result;
        } catch (Throwable e) {
            if (entityId == null || entityId.isEmpty()) {
                entityId = resolveResultId(null);
            }
            auditLogService.save(auditLog.action(), auditLog.entity(), entityId,
                    user, ip, requestId, LogConstant.Status.FAILED, e.getMessage(),
                    oldValue, null);
            throw e;
        }
    }

    private String captureOldValue(Class<?> entityClass, ProceedingJoinPoint joinPoint) {
        if (entityClass == void.class) return null;

        Object idValue = findParamValue("id", joinPoint);
        if (idValue == null) return null;

        try {
            Object entity = entityManager.find(entityClass, idValue);
            if (entity == null) return null;
            return objectMapper.writeValueAsString(entity);
        } catch (Exception e) {
            log.warn("Failed to capture old value for {}: {}", entityClass.getSimpleName(), e.getMessage());
            return null;
        }
    }

    private String serializeResult(Object result) {
        if (result == null) return null;
        Class<?> type = result.getClass();
        if (type == String.class || type.isPrimitive()
                || type == Boolean.class || type == Integer.class
                || type == Long.class || type == Double.class
                || type == Float.class || type == Short.class) return null;
        try {
            return objectMapper.writeValueAsString(result);
        } catch (Exception e) {
            log.warn("Failed to serialize result: {}", e.getMessage());
            return null;
        }
    }

    private Object findParamValue(String name, ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] paramNames = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();
        if (paramNames != null) {
            for (int i = 0; i < paramNames.length; i++) {
                if (name.equals(paramNames[i])) return args[i];
            }
        }
        return null;
    }

    private String resolveParamId(ProceedingJoinPoint joinPoint) {
        Object idValue = findParamValue("id", joinPoint);
        if (idValue != null) return idValue.toString();

        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId != null) return currentUserId.toString();
        return "";
    }

    private String resolveResultId(Object result) {
        if (result == null) {
            Long currentUserId = SecurityUtils.getCurrentUserId();
            return currentUserId != null ? currentUserId.toString() : "";
        }
        for (var m : result.getClass().getMethods()) {
            if (m.getParameterCount() == 0
                    && (m.getName().equals("getId") || m.getName().equals("id"))
                    && !m.getReturnType().equals(Void.TYPE)) {
                try {
                    Object id = m.invoke(result);
                    if (id != null) return id.toString();
                } catch (Exception ignored) {}
            }
        }
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return currentUserId != null ? currentUserId.toString() : "";
    }

    private String getClientIp() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
            return ip;
        } catch (Exception e) {
            return "";
        }
    }
}
