package org.dawn.backend.repository.inventory.adjustments;

import org.dawn.backend.entity.inventory.SellPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SellPriceHistoryRepository extends JpaRepository<SellPriceHistory, Long> {
    List<SellPriceHistory> findByProductIdOrderByChangedAtDesc(Long productId);
}
