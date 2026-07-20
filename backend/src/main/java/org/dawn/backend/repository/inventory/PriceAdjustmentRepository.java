package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.PriceAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PriceAdjustmentRepository extends JpaRepository<PriceAdjustment, Long> {
    boolean existsByAdjustCode(String adjustCode);

    Page<PriceAdjustment> findByCreatedBy(Long createdBy, Pageable pageable);

    Page<PriceAdjustment> findByStatus(String status, Pageable pageable);

    Page<PriceAdjustment> findByCreatedByAndStatus(Long createdBy, String status, Pageable pageable);
}
