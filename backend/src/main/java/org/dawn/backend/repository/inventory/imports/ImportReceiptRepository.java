package org.dawn.backend.repository.inventory.imports;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.entity.inventory.ImportReceipt;
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
public interface ImportReceiptRepository extends JpaRepository<ImportReceipt, Long> {
    Optional<ImportReceipt> findByReceiptCode(String receiptCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ImportReceipt r WHERE r.id = :id")
    Optional<ImportReceipt> findByIdForUpdate(@Param("id") Long id);

    Page<ImportReceipt> findByStatus(ImportReceiptStatus status, Pageable pageable);
    Page<ImportReceipt> findBySupplierId(Long supplierId, Pageable pageable);
    boolean existsByReceiptCode(String receiptCode);
    Page<ImportReceipt> findByReceiptCodeStartingWith(String prefix, Pageable pageable);
    List<ImportReceipt> findByCreatedAtBetween(Instant from, Instant to);
    long countByCreatedAtBetween(Instant from, Instant to);
    List<ImportReceipt> findByPurchaseOrderId(Long purchaseOrderId);
    boolean existsByPurchaseOrderIdAndStatus(Long purchaseOrderId, ImportReceiptStatus status);

    @Query("SELECT COALESCE(SUM(r.totalAmount), 0) FROM ImportReceipt r WHERE r.status = 'COMPLETED' AND r.createdAt BETWEEN :from AND :to")
    BigDecimal sumTotalAmountByStatusAndCreatedAtBetween(@Param("from") Instant from, @Param("to") Instant to);
}
