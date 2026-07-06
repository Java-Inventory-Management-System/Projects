package org.dawn.backend.service.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.entity.system.AuditLog;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.repository.audit.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository repository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void save(String action, String entity, String entityId,
                     UserDetailsImpl user, String ip, String requestId,
                     String status, String errorMsg,
                     String oldValue, String newValue) {
        try {
            AuditLog log = AuditLog.builder()
                    .action(action)
                    .entityName(entity)
                    .entityId(entityId)
                    .userId(user != null ? user.getId() : null)
                    .username(user != null ? user.getUsername() : "SYSTEM")
                    .ipAddress(ip)
                    .requestId(requestId)
                    .status(status)
                    .errorMsg(errorMsg)
                    .oldValue(oldValue)
                    .newValue(newValue)
                    .build();
            repository.save(log);
        } catch (Exception e) {
            log.error("Failed to save audit log: {}", e.getMessage());
        }
    }

    public Page<AuditLog> search(String action, String entity, Long userId,
                                  String status, Instant from, Instant to,
                                  Pageable pageable) {
        return repository.search(action, entity, userId, status, from, to, pageable);
    }
}
