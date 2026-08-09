package org.dawn.backend.repository.inventory.stockcheck;

import org.dawn.backend.entity.inventory.StockCheckBoxConfirm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockCheckBoxConfirmRepository extends JpaRepository<StockCheckBoxConfirm, Long> {
    List<StockCheckBoxConfirm> findByStockCheckId(Long stockCheckId);
}
