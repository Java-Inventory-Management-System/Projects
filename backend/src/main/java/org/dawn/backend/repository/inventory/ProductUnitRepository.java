package org.dawn.backend.repository.inventory;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Repository
public interface ProductUnitRepository extends JpaRepository<ProductUnit, Long> {
    Optional<ProductUnit> findBySerialNumber(String serialNumber);
    Optional<ProductUnit> findBySerialNumberIgnoreCase(String serialNumber);
    boolean existsBySerialNumber(String serialNumber);

    @Query(value = """
            SELECT pu.* FROM product_units pu
            WHERE UPPER(REPLACE(REPLACE(REPLACE(pu.serial_number, 'O', '0'), 'I', '1'), 'L', '1')) = :normalized
            ORDER BY pu.id
            """, nativeQuery = true)
    List<ProductUnit> findByNormalizedSerial(@Param("normalized") String normalized);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductUnit p WHERE p.id = :id")
    Optional<ProductUnit> findByIdForUpdate(@Param("id") Long id);

    static final String NOT_IN_STOCK_CHECK = "AND p.id NOT IN (SELECT sci.productUnitId FROM StockCheckItem sci WHERE sci.stockCheckId IN (SELECT sc.id FROM StockCheck sc WHERE sc.status = 'IN_PROGRESS'))";

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductUnit p WHERE p.id IN :ids")
    List<ProductUnit> findByIdsForUpdate(@Param("ids") List<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductUnit p WHERE p.id IN :ids AND p.status = 'IN_STOCK' " + NOT_IN_STOCK_CHECK + " ORDER BY p.importedAt ASC")
    List<ProductUnit> findByIdInWithLock(@Param("ids") List<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductUnit p WHERE p.productId = :productId AND p.status = 'IN_STOCK' " + NOT_IN_STOCK_CHECK + " AND p.boxId IS NULL ORDER BY p.importedAt ASC")
    List<ProductUnit> findAvailableForExportWithLock(@Param("productId") Long productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductUnit p WHERE p.productId = :productId AND p.status = 'IN_STOCK' " + NOT_IN_STOCK_CHECK + " AND p.boxId IS NULL")
    List<ProductUnit> findByProductIdAndStatusWithLock(@Param("productId") Long productId);

    @Query("SELECT p.serialNumber FROM ProductUnit p WHERE p.serialNumber IN :serials")
    Set<String> findExistingSerialNumbers(@Param("serials") List<String> serials);
    List<ProductUnit> findByImportReceiptItemId(Long importReceiptItemId);
    List<ProductUnit> findByImportReceiptItemIdIn(List<Long> importReceiptItemIds);
    List<ProductUnit> findByProductIdAndStatus(Long productId, ProductUnitStatus status);
    List<ProductUnit> findByProductIdAndStatusAndBoxIdIsNull(Long productId, ProductUnitStatus status);
    List<ProductUnit> findByProductIdAndStatusAndBoxIdIsNotNull(Long productId, ProductUnitStatus status);
    @Query("SELECT COUNT(p) FROM ProductUnit p WHERE p.productId = :productId AND p.status = :status AND p.id NOT IN (SELECT sci.productUnitId FROM StockCheckItem sci WHERE sci.stockCheckId IN (SELECT sc.id FROM StockCheck sc WHERE sc.status = 'IN_PROGRESS'))")
    long countByProductIdAndStatus(@Param("productId") Long productId, @Param("status") ProductUnitStatus status);
    @Query("SELECT COUNT(p) FROM ProductUnit p WHERE p.productId = :productId AND p.status = :status AND p.boxId IS NULL AND p.id NOT IN (SELECT sci.productUnitId FROM StockCheckItem sci WHERE sci.stockCheckId IN (SELECT sc.id FROM StockCheck sc WHERE sc.status = 'IN_PROGRESS'))")
    long countByProductIdAndStatusAndBoxIdIsNull(@Param("productId") Long productId, @Param("status") ProductUnitStatus status);

    @Query("SELECT COALESCE(SUM(CASE WHEN p.trackingType = 'BULK' THEN COALESCE(p.remainingQuantity, 0) ELSE 1 END), 0) FROM ProductUnit p WHERE p.productId = :productId AND p.status = :status AND p.boxId IS NULL " + NOT_IN_STOCK_CHECK)
    BigDecimal sumQuantityByProductIdAndStatusAndBoxIdIsNull(@Param("productId") Long productId, @Param("status") ProductUnitStatus status);

    @Query("SELECT COALESCE(SUM(CASE WHEN p.trackingType = 'BULK' THEN COALESCE(p.remainingQuantity, 0) ELSE 1 END), 0) FROM ProductUnit p WHERE p.productId = :productId AND p.status = :status " + NOT_IN_STOCK_CHECK)
    BigDecimal sumQuantityByProductIdAndStatus(@Param("productId") Long productId, @Param("status") ProductUnitStatus status);
    long countByLocationId(Long locationId);
    Page<ProductUnit> findByStatus(ProductUnitStatus status, Pageable pageable);
    List<ProductUnit> findByStatusInOrderById(Collection<ProductUnitStatus> statuses);

    @Query("""
            SELECT p FROM ProductUnit p JOIN Product pr ON pr.id = p.productId WHERE
              (:search IS NULL OR LOWER(p.serialNumber) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(pr.sku) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(pr.name) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:status IS NULL OR p.status = :status)
              AND (:productId IS NULL OR p.productId = :productId)
            """)
    Page<ProductUnit> findFiltered(
            @Param("search") String search,
            @Param("status") ProductUnitStatus status,
            @Param("productId") Long productId,
            Pageable pageable);

    @Query("""
            SELECT u FROM ProductUnit u
            WHERE u.productId = :productId
              AND u.boxId IS NULL
              AND u.id NOT IN (SELECT sci.productUnitId FROM StockCheckItem sci
                               WHERE sci.stockCheckId IN (SELECT sc.id FROM StockCheck sc WHERE sc.status = 'IN_PROGRESS'))
            """)
    Page<ProductUnit> findByProductId(@Param("productId") Long productId, Pageable pageable);

    List<ProductUnit> findByProductIdInAndStatus(List<Long> productIds, ProductUnitStatus status);

    @Query("SELECT p FROM ProductUnit p WHERE p.productId IN :productIds AND p.status = :status " + NOT_IN_STOCK_CHECK)
    List<ProductUnit> findByProductIdInAndStatusNotInStockCheck(@Param("productIds") List<Long> productIds, @Param("status") ProductUnitStatus status);

    List<ProductUnit> findByLocationIdInAndStatus(List<Long> locationIds, ProductUnitStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductUnit p WHERE p.locationId IN :locationIds AND p.status = :status")
    List<ProductUnit> findByLocationIdInAndStatusWithLock(@Param("locationIds") List<Long> locationIds, @Param("status") ProductUnitStatus status);

    List<ProductUnit> findByBoxIdAndStatus(Long boxId, ProductUnitStatus status);
    List<ProductUnit> findByBoxId(Long boxId);
    List<ProductUnit> findByBoxIdInAndStatus(List<Long> boxIds, ProductUnitStatus status);

    long countByBoxId(Long boxId);

    @Query(value = """
            SELECT pu.* FROM product_units pu
            JOIN import_receipt_items iri ON pu.import_receipt_item_id = iri.id
            JOIN import_receipts ir ON iri.receipt_id = ir.id
            WHERE pu.product_id = ?1 AND pu.status = 'IN_STOCK' AND ir.status = 'COMPLETED'
            ORDER BY pu.imported_at ASC
            """, nativeQuery = true)
    List<ProductUnit> findAvailableForExport(Long productId);

    @Query("SELECT p.locationId, COUNT(p) FROM ProductUnit p WHERE p.status = 'IN_STOCK' AND p.locationId IS NOT NULL GROUP BY p.locationId")
    List<Object[]> countByLocationRaw();

    @Query("""
            SELECT p.locationId,
              SUM(CASE WHEN p.trackingType = 'BULK' THEN COALESCE(p.remainingQuantity, 0) ELSE 1 END)
            FROM ProductUnit p
            WHERE p.status = 'IN_STOCK' AND p.locationId IS NOT NULL AND p.boxId IS NULL
            GROUP BY p.locationId
            """)
    List<Object[]> usageByLocationRaw();

    @Query("SELECT COALESCE(SUM(CASE WHEN p.trackingType = 'BULK' THEN COALESCE(p.remainingQuantity, 0) ELSE 1 END), 0) FROM ProductUnit p WHERE p.status = 'IN_STOCK' AND p.locationId = :locationId AND p.id IN :ids")
    BigDecimal usageByLocationIdAndIdIn(@Param("locationId") Long locationId, @Param("ids") Collection<Long> ids);

    @Query("SELECT pu FROM ProductUnit pu WHERE pu.status = 'IN_STOCK' AND pu.importedAt < :cutoffDate ORDER BY pu.importedAt ASC")
    List<ProductUnit> findDeadStockUnits(@Param("cutoffDate") Instant cutoffDate);

    @Query(value = """
            SELECT pu.* FROM product_units pu
            LEFT JOIN products p ON pu.product_id = p.id
            WHERE pu.status = 'IN_STOCK'
            AND (:cutoffDate IS NULL OR pu.imported_at < :cutoffDate)
            AND (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:categoryId IS NULL OR p.category_id = :categoryId)
            AND (:fromDate IS NULL OR pu.imported_at >= :fromDate)
            AND (:toDate IS NULL OR pu.imported_at <= :toDate)
            """,
            countQuery = """
            SELECT COUNT(*) FROM product_units pu
            LEFT JOIN products p ON pu.product_id = p.id
            WHERE pu.status = 'IN_STOCK'
            AND (:cutoffDate IS NULL OR pu.imported_at < :cutoffDate)
            AND (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:categoryId IS NULL OR p.category_id = :categoryId)
            AND (:fromDate IS NULL OR pu.imported_at >= :fromDate)
            AND (:toDate IS NULL OR pu.imported_at <= :toDate)
            """,
            nativeQuery = true)
    Page<ProductUnit> findDeadStockFiltered(
            @Param("cutoffDate") Instant cutoffDate,
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable);

    @Query("SELECT p.importReceiptItemId, COUNT(p) FROM ProductUnit p WHERE p.importReceiptItemId IN :itemIds GROUP BY p.importReceiptItemId")
    List<Object[]> countByImportReceiptItemIdIn(@Param("itemIds") List<Long> itemIds);

    @Query("SELECT p.importReceiptItemId, COUNT(p) FROM ProductUnit p WHERE p.status = 'IN_STOCK' AND p.boxId IS NULL AND p.importReceiptItemId IS NOT NULL GROUP BY p.importReceiptItemId")
    List<Object[]> countBoxableByImportReceiptItem();

    @Query(value = """
            SELECT pu.product_id,
              CASE WHEN p.tracking_type = 'BULK' THEN SUM(pu.remaining_quantity) ELSE COUNT(*) END as qty,
              p.min_stock,
              p.sell_price,
              CASE WHEN p.tracking_type = 'BULK' THEN SUM(pu.remaining_quantity * COALESCE(pu.cost_price, 0))
                   ELSE SUM(COALESCE(pu.cost_price, 0)) END as cost_value
            FROM product_units pu
            JOIN products p ON p.id = pu.product_id
            WHERE pu.status = 'IN_STOCK' AND p.is_active = true
              AND pu.id NOT IN (
                  SELECT sci.product_unit_id FROM stock_check_items sci
                  JOIN stock_checks sc ON sc.id = sci.stock_check_id
                  WHERE sc.status = 'IN_PROGRESS')
            GROUP BY pu.product_id, p.tracking_type, p.min_stock, p.sell_price
            """, nativeQuery = true)
    List<Object[]> aggregateInStockByProduct();

    @Query(value = """
            SELECT pu.product_id,
              CASE WHEN p.tracking_type = 'BULK' THEN SUM(pu.remaining_quantity) ELSE COUNT(*) END as qty,
              p.min_stock,
              p.sell_price,
              p.category_id,
              CASE WHEN p.tracking_type = 'BULK' THEN SUM(pu.remaining_quantity * COALESCE(pu.cost_price, 0))
                   ELSE SUM(COALESCE(pu.cost_price, 0)) END as cost_value
            FROM product_units pu
            JOIN products p ON p.id = pu.product_id
            WHERE pu.status = 'IN_STOCK' AND p.is_active = true AND pu.product_id IN :productIds
              AND pu.id NOT IN (
                  SELECT sci.product_unit_id FROM stock_check_items sci
                  JOIN stock_checks sc ON sc.id = sci.stock_check_id
                  WHERE sc.status = 'IN_PROGRESS')
            GROUP BY pu.product_id, p.tracking_type, p.min_stock, p.sell_price, p.category_id
            """, nativeQuery = true)
    List<Object[]> aggregateInStockByProductIdIn(@Param("productIds") List<Long> productIds);

    @Query(value = "SELECT pu.location_id, p.sku FROM product_units pu JOIN products p ON pu.product_id = p.id WHERE pu.status = 'IN_STOCK' AND pu.location_id IS NOT NULL", nativeQuery = true)
    List<Object[]> findSkuByLocationIdRaw();

    default Map<Long, List<String>> findSkuByLocationId() {
        return findSkuByLocationIdRaw().stream()
            .collect(Collectors.groupingBy(
                row -> (Long) row[0],
                Collectors.mapping(row -> (String) row[1], Collectors.toList())
            ));
    }

@Query("SELECT p FROM ProductUnit p WHERE p.status = 'IN_STOCK' AND p.locationId IN :locationIds ORDER BY p.productId, p.importedAt ASC")
List<ProductUnit> findInStockUnitsByLocationIdIn(@Param("locationIds") Collection<Long> locationIds);

    default Map<Long, Long> countByLocation() {
        return countByLocationRaw().stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }

    default Map<Long, BigDecimal> usageByLocation() {
        return usageByLocationRaw().stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]));
    }
}
