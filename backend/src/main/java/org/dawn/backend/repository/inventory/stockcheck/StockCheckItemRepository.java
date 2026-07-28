package org.dawn.backend.repository.inventory.stockcheck;

import org.dawn.backend.entity.inventory.StockCheckItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StockCheckItemRepository extends JpaRepository<StockCheckItem, Long> {
    List<StockCheckItem> findByStockCheckId(Long stockCheckId);

    List<StockCheckItem> findByStockCheckIdInAndProductUnitId(List<Long> stockCheckIds, Long productUnitId);

    void deleteByStockCheckId(Long stockCheckId);

    @Query("SELECT COUNT(sci) > 0 FROM StockCheckItem sci WHERE sci.productUnitId = :productUnitId AND sci.stockCheckId IN (SELECT sc.id FROM StockCheck sc WHERE sc.status = 'IN_PROGRESS')")
    boolean existsByProductUnitIdInActiveCheck(@Param("productUnitId") Long productUnitId);
}
