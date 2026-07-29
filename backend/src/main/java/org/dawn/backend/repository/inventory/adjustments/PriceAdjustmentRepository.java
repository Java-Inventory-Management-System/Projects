package org.dawn.backend.repository.inventory.adjustments;

import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.entity.inventory.PriceAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PriceAdjustmentRepository extends JpaRepository<PriceAdjustment, Long> {
    boolean existsByAdjustCode(String adjustCode);

    Page<PriceAdjustment> findByCreatedBy(Long createdBy, Pageable pageable);

    Page<PriceAdjustment> findByStatus(AdjustmentStatus status, Pageable pageable);

    Page<PriceAdjustment> findByCreatedByAndStatus(Long createdBy, AdjustmentStatus status, Pageable pageable);

    Optional<PriceAdjustment> findByImportReceiptItemIdAndStatus(Long importReceiptItemId, AdjustmentStatus status);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE PriceAdjustment a SET a.status = :status, a.approvedBy = :approvedBy, a.approvalNote = :approvalNote WHERE a.id = :id AND a.status = 'PENDING'")
    int optimisticUpdateStatus(@Param("id") Long id, @Param("status") AdjustmentStatus status,
                               @Param("approvedBy") Long approvedBy, @Param("approvalNote") String approvalNote);
}
