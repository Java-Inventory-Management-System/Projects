package org.dawn.backend.repository.inventory.exports;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExportReceiptRepository extends JpaRepository<ExportReceipt, Long> {
    Optional<ExportReceipt> findByReceiptCode(String receiptCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM ExportReceipt e WHERE e.id = :id")
    Optional<ExportReceipt> findByIdForUpdate(@Param("id") Long id);

    Page<ExportReceipt> findByStatus(ExportReceiptStatus status, Pageable pageable);
    Page<ExportReceipt> findByCustomerId(Long customerId, Pageable pageable);
    Page<ExportReceipt> findByCustomerIdAndStatus(Long customerId, ExportReceiptStatus status, Pageable pageable);
    Page<ExportReceipt> findByCreatedBy(Long createdBy, Pageable pageable);
    Page<ExportReceipt> findByStatusAndCreatedBy(ExportReceiptStatus status, Long createdBy, Pageable pageable);
    long countByCustomerId(Long customerId);
    boolean existsByReceiptCode(String receiptCode);
    Page<ExportReceipt> findByReceiptCodeStartingWith(String prefix, Pageable pageable);
    List<ExportReceipt> findByCreatedAtBetween(Instant from, Instant to);
    long countByCreatedAtBetween(Instant from, Instant to);
    List<ExportReceipt> findByStatusAndCreatedAtBefore(ExportReceiptStatus status, Instant createdAt);

    @Query("""
            SELECT COALESCE(SUM(ei.quantity), 0) FROM ExportReceiptItem ei
            JOIN ExportReceipt e ON e.id = ei.receiptId
            WHERE ei.productId = :productId AND e.status IN :statuses
            """)
    BigDecimal sumCommittedQuantityByProductIdAndStatusIn(
            @Param("productId") Long productId,
            @Param("statuses") List<ExportReceiptStatus> statuses);

    @Query("SELECT COALESCE(SUM(r.totalAmount), 0) FROM ExportReceipt r WHERE r.status = 'COMPLETED' AND r.createdAt BETWEEN :from AND :to")
    BigDecimal sumTotalAmountByStatusAndCreatedAtBetween(@Param("from") Instant from, @Param("to") Instant to);
}
