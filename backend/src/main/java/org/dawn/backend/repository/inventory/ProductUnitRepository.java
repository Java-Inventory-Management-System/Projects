package org.dawn.backend.repository.inventory;

import jakarta.persistence.LockModeType;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
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

    @Query("SELECT p.serialNumber FROM ProductUnit p WHERE p.serialNumber IN :serials")
    Set<String> findExistingSerialNumbers(@Param("serials") List<String> serials);
    List<ProductUnit> findByImportReceiptItemId(Long importReceiptItemId);
    List<ProductUnit> findByProductIdAndStatus(Long productId, String status);
    long countByProductIdAndStatus(Long productId, String status);
    long countByLocationId(Long locationId);
    Page<ProductUnit> findByStatus(String status, Pageable pageable);
    Page<ProductUnit> findByProductId(Long productId, Pageable pageable);

    List<ProductUnit> findByProductIdInAndStatus(List<Long> productIds, String status);

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

    @Query("SELECT pu FROM ProductUnit pu WHERE pu.status = 'IN_STOCK' AND pu.importedAt < :cutoffDate ORDER BY pu.importedAt ASC")
    List<ProductUnit> findDeadStockUnits(@Param("cutoffDate") Instant cutoffDate);

    default Map<Long, Long> countByLocation() {
        return countByLocationRaw().stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }
}
