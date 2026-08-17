package org.dawn.backend.repository.inventory.exports;

import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ExportReceiptItemRepository extends JpaRepository<ExportReceiptItem, Long> {
    List<ExportReceiptItem> findByReceiptId(Long receiptId);
    void deleteByReceiptId(Long receiptId);

    @Query("SELECT i.productId, SUM(i.quantity) FROM ExportReceiptItem i " +
           "WHERE i.receiptId = :receiptId GROUP BY i.productId")
    List<Object[]> sumQuantityByReceiptGroupByProduct(@Param("receiptId") Long receiptId);

    @Query("SELECT COALESCE(SUM(i.quantity), 0) FROM ExportReceiptItem i " +
           "WHERE i.receiptId = :receiptId AND i.productId = :productId")
    BigDecimal sumQuantityByReceiptAndProduct(@Param("receiptId") Long receiptId,
                                              @Param("productId") Long productId);
}
