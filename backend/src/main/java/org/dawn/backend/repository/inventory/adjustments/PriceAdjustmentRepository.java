package org.dawn.backend.repository.inventory.adjustments;

import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.entity.inventory.PriceAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PriceAdjustmentRepository extends JpaRepository<PriceAdjustment, Long> {
    boolean existsByAdjustCode(String adjustCode);

    @Query("""
            SELECT a FROM PriceAdjustment a
            WHERE (:status IS NULL OR a.status = :status)
              AND (:search IS NULL
                   OR LOWER(a.adjustCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR a.importReceiptItemId IN (
                       SELECT i.id FROM ImportReceiptItem i
                       WHERE i.productId IN (
                           SELECT pr.id FROM Product pr
                           WHERE LOWER(pr.name) LIKE LOWER(CONCAT('%', :search, '%'))
                              OR LOWER(pr.sku) LIKE LOWER(CONCAT('%', :search, '%')))))
            """)
    Page<PriceAdjustment> findFiltered(@Param("search") String search, @Param("status") AdjustmentStatus status, Pageable pageable);

    @Query("""
            SELECT a FROM PriceAdjustment a
            WHERE a.createdBy = :createdBy
              AND (:status IS NULL OR a.status = :status)
              AND (:search IS NULL
                   OR LOWER(a.adjustCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR a.importReceiptItemId IN (
                       SELECT i.id FROM ImportReceiptItem i
                       WHERE i.productId IN (
                           SELECT pr.id FROM Product pr
                           WHERE LOWER(pr.name) LIKE LOWER(CONCAT('%', :search, '%'))
                              OR LOWER(pr.sku) LIKE LOWER(CONCAT('%', :search, '%')))))
            """)
    Page<PriceAdjustment> findFilteredByCreatedBy(@Param("createdBy") Long createdBy, @Param("search") String search, @Param("status") AdjustmentStatus status, Pageable pageable);

    Optional<PriceAdjustment> findByImportReceiptItemIdAndStatus(Long importReceiptItemId, AdjustmentStatus status);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE PriceAdjustment a SET a.status = :status, a.approvedBy = :approvedBy, a.approvalNote = :approvalNote WHERE a.id = :id AND a.status = 'PENDING'")
    int optimisticUpdateStatus(@Param("id") Long id, @Param("status") AdjustmentStatus status,
                               @Param("approvedBy") Long approvedBy, @Param("approvalNote") String approvalNote);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE PriceAdjustment a SET a.status = 'APPROVED', a.approvedBy = :approvedBy, a.approvalNote = :approvalNote, a.approvedAt = :approvedAt WHERE a.id = :id AND a.status = 'PENDING'")
    int optimisticApprove(@Param("id") Long id, @Param("approvedBy") Long approvedBy,
                          @Param("approvalNote") String approvalNote, @Param("approvedAt") Instant approvedAt);

    List<PriceAdjustment> findByImportReceiptItemIdIn(List<Long> importReceiptItemIds);

    @Query("SELECT a.importReceiptItemId FROM PriceAdjustment a WHERE a.status = :status")
    List<Long> findImportReceiptItemIdsByStatus(@Param("status") AdjustmentStatus status);
}
