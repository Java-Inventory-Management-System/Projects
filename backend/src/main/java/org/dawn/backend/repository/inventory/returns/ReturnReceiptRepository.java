package org.dawn.backend.repository.inventory.returns;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.enums.inventory.returns.ReturnReceiptStatus;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnReceiptRepository extends JpaRepository<ReturnReceipt, Long> {
    boolean existsByReceiptCode(String receiptCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ReturnReceipt r WHERE r.id = :id")
    Optional<ReturnReceipt> findByIdForUpdate(@Param("id") Long id);

    List<ReturnReceipt> findByOriginalExportReceiptId(Long exportReceiptId);
    List<ReturnReceipt> findByCustomerId(Long customerId);
    Page<ReturnReceipt> findByStatus(ReturnReceiptStatus status, Pageable pageable);
    Page<ReturnReceipt> findByReason(String reason, Pageable pageable);
    Page<ReturnReceipt> findByStatusAndReason(ReturnReceiptStatus status, String reason, Pageable pageable);
    Page<ReturnReceipt> findByReceiptCodeContainingIgnoreCase(String receiptCode, Pageable pageable);
    List<ReturnReceipt> findByStatusAndCreatedAtBefore(ReturnReceiptStatus status, Instant createdAt);
}
