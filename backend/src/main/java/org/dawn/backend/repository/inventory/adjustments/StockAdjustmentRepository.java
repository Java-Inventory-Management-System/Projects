package org.dawn.backend.repository.inventory.adjustments;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {
    boolean existsByAdjustCode(String adjustCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM StockAdjustment a WHERE a.id = :id")
    Optional<StockAdjustment> findByIdForUpdate(@Param("id") Long id);

    Page<StockAdjustment> findByCreatedBy(Long createdBy, Pageable pageable);

    Page<StockAdjustment> findByType(String type, Pageable pageable);

    Page<StockAdjustment> findByStatus(AdjustmentStatus status, Pageable pageable);

    Page<StockAdjustment> findByTypeAndStatus(String type, AdjustmentStatus status, Pageable pageable);

    Page<StockAdjustment> findByCreatedByAndType(Long createdBy, String type, Pageable pageable);

    Page<StockAdjustment> findByCreatedByAndStatus(Long createdBy, AdjustmentStatus status, Pageable pageable);

    Page<StockAdjustment> findByCreatedByAndTypeAndStatus(Long createdBy, String type, AdjustmentStatus status, Pageable pageable);

    Page<StockAdjustment> findByProductUnitIdOrderByCreatedAtDesc(Long productUnitId, Pageable pageable);

    boolean existsBySourceTypeAndSourceId(String sourceType, Long sourceId);

    java.util.List<StockAdjustment> findBySourceTypeAndCreatedAtBetween(String sourceType, java.time.Instant from, java.time.Instant to);
}
