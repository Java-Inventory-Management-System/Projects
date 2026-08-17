package org.dawn.backend.repository.inventory.exports;

import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;

@Repository
public interface ExportReceiptItemUnitRepository extends JpaRepository<ExportReceiptItemUnit, Long> {
    List<ExportReceiptItemUnit> findByExportReceiptItemId(Long exportReceiptItemId);
    List<ExportReceiptItemUnit> findByExportReceiptItemIdIn(Collection<Long> exportReceiptItemIds);
    List<ExportReceiptItemUnit> findByProductUnitId(Long productUnitId);
    List<ExportReceiptItemUnit> findByProductUnitIdIn(Collection<Long> productUnitIds);

    @Query("SELECT eiu.productUnitId FROM ExportReceiptItemUnit eiu WHERE eiu.exportReceiptItemId IN " +
           "(SELECT ei.id FROM ExportReceiptItem ei WHERE ei.receiptId = :receiptId)")
    Set<Long> findProductUnitIdsByReceiptId(@Param("receiptId") Long receiptId);

    @Query("""
            SELECT COALESCE(SUM(pu.costPrice), 0) FROM ProductUnit pu
            WHERE pu.id IN (SELECT eiu.productUnitId FROM ExportReceiptItemUnit eiu
                            WHERE eiu.exportReceiptItemId IN (SELECT ei.id FROM ExportReceiptItem ei
                                WHERE ei.receiptId IN (SELECT e.id FROM ExportReceipt e
                                    WHERE e.status = 'COMPLETED' AND e.createdAt BETWEEN :from AND :to)))
            """)
    BigDecimal sumCostPriceOfCompletedExports(@Param("from") Instant from, @Param("to") Instant to);
}
