package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.StockCheck;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockCheckRepository extends JpaRepository<StockCheck, Long> {
    boolean existsByCheckCode(String checkCode);

    Page<StockCheck> findByCreatedBy(Long createdBy, Pageable pageable);
}
