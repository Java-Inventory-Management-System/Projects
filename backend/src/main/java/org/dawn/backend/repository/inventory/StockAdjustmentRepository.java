package org.dawn.backend.repository.inventory;

import org.dawn.backend.constant.inventory.AdjustmentStatus;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {
    boolean existsByAdjustCode(String adjustCode);

    Page<StockAdjustment> findByCreatedBy(Long createdBy, Pageable pageable);

    Page<StockAdjustment> findByType(String type, Pageable pageable);

    Page<StockAdjustment> findByStatus(AdjustmentStatus status, Pageable pageable);

    Page<StockAdjustment> findByTypeAndStatus(String type, AdjustmentStatus status, Pageable pageable);

    Page<StockAdjustment> findByCreatedByAndType(Long createdBy, String type, Pageable pageable);

    Page<StockAdjustment> findByCreatedByAndStatus(Long createdBy, AdjustmentStatus status, Pageable pageable);

    Page<StockAdjustment> findByCreatedByAndTypeAndStatus(Long createdBy, String type, AdjustmentStatus status, Pageable pageable);
}
