package org.dawn.backend.repository.inventory.stockcheck;

import org.dawn.backend.entity.inventory.StockCheckItemHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockCheckItemHistoryRepository extends JpaRepository<StockCheckItemHistory, Long> {
    List<StockCheckItemHistory> findByStockCheckIdOrderByIdAsc(Long stockCheckId);
}