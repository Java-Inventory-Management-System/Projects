package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.StockCheckItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockCheckItemRepository extends JpaRepository<StockCheckItem, Long> {
    List<StockCheckItem> findByStockCheckId(Long stockCheckId);

    void deleteByStockCheckId(Long stockCheckId);
}
