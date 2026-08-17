package org.dawn.backend.repository.inventory.returns;

import org.dawn.backend.constant.enums.inventory.returns.ReturnReceiptStatus;
import org.dawn.backend.entity.inventory.ReturnReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

@Repository
public interface ReturnReceiptItemRepository extends JpaRepository<ReturnReceiptItem, Long> {
    List<ReturnReceiptItem> findByReturnReceiptId(Long returnReceiptId);
    List<ReturnReceiptItem> findByReturnReceiptIdIn(List<Long> returnReceiptIds);
    List<ReturnReceiptItem> findByProductUnitIdIn(Collection<Long> productUnitIds);

    @Query("SELECT COUNT(i) > 0 FROM ReturnReceiptItem i, ReturnReceipt r " +
           "WHERE i.returnReceiptId = r.id AND i.productUnitId IN :unitIds AND r.status <> :cancelled")
    boolean existsByProductUnitIdsInNonCancelledReceipts(@Param("unitIds") Collection<Long> unitIds,
                                                          @Param("cancelled") ReturnReceiptStatus cancelled);

    @Query("SELECT COUNT(i) > 0 FROM ReturnReceiptItem i, ReturnReceipt r " +
           "WHERE i.returnReceiptId = r.id AND r.originalExportReceiptId = :exportReceiptId " +
           "AND i.productUnitId IS NULL AND i.productId = :productId AND r.status <> :cancelled")
    boolean existsBulkByExportAndProductInNonCancelled(@Param("exportReceiptId") Long exportReceiptId,
                                                       @Param("productId") Long productId,
                                                       @Param("cancelled") ReturnReceiptStatus cancelled);

    @Query("SELECT i.productUnitId FROM ReturnReceiptItem i, ReturnReceipt r " +
           "WHERE i.returnReceiptId = r.id AND i.productUnitId IS NOT NULL AND r.status <> :cancelled")
    List<Long> findHeldUnitIdsInNonCancelledReceipts(@Param("cancelled") ReturnReceiptStatus cancelled);

    @Query("SELECT COALESCE(SUM(i.quantity), 0) FROM ReturnReceiptItem i, ReturnReceipt r " +
           "WHERE i.returnReceiptId = r.id AND r.originalExportReceiptId = :exportReceiptId " +
           "AND i.productId = :productId AND i.productUnitId IS NULL AND r.status <> :cancelled")
    BigDecimal sumBulkReturnedQtyByExportAndProduct(@Param("exportReceiptId") Long exportReceiptId,
                                                    @Param("productId") Long productId,
                                                    @Param("cancelled") ReturnReceiptStatus cancelled);

    @Query("SELECT COUNT(i) FROM ReturnReceiptItem i, ReturnReceipt r " +
           "WHERE i.returnReceiptId = r.id AND r.originalExportReceiptId = :exportReceiptId " +
           "AND i.productId = :productId AND i.productUnitId IS NOT NULL AND r.status <> :cancelled")
    Long countSerialReturnedByExportAndProduct(@Param("exportReceiptId") Long exportReceiptId,
                                               @Param("productId") Long productId,
                                               @Param("cancelled") ReturnReceiptStatus cancelled);
}
