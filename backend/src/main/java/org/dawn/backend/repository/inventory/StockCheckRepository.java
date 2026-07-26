package org.dawn.backend.repository.inventory;

import org.dawn.backend.constant.inventory.StockCheckStatus;
import org.dawn.backend.entity.inventory.StockCheck;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockCheckRepository extends JpaRepository<StockCheck, Long> {
    boolean existsByCheckCode(String checkCode);

    Page<StockCheck> findByCreatedBy(Long createdBy, Pageable pageable);

    Page<StockCheck> findByCreatedByAndStatus(Long createdBy, StockCheckStatus status, Pageable pageable);

    Page<StockCheck> findByStatus(StockCheckStatus status, Pageable pageable);

    List<StockCheck> findByStatus(StockCheckStatus status);
}