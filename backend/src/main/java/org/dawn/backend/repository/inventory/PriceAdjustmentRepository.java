package org.dawn.backend.repository.inventory;

import org.dawn.backend.constant.inventory.AdjustmentStatus;
import org.dawn.backend.entity.inventory.PriceAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PriceAdjustmentRepository extends JpaRepository<PriceAdjustment, Long> {
    boolean existsByAdjustCode(String adjustCode);

    Page<PriceAdjustment> findByCreatedBy(Long createdBy, Pageable pageable);

    Page<PriceAdjustment> findByStatus(AdjustmentStatus status, Pageable pageable);

    Page<PriceAdjustment> findByCreatedByAndStatus(Long createdBy, AdjustmentStatus status, Pageable pageable);
}
