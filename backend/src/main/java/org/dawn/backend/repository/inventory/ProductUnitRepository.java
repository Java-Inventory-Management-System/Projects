package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.ProductUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductUnitRepository extends JpaRepository<ProductUnit, Long> {
    Optional<ProductUnit> findBySerialNumber(String serialNumber);
    boolean existsBySerialNumber(String serialNumber);
    List<ProductUnit> findByImportReceiptItemId(Long importReceiptItemId);
    List<ProductUnit> findByProductIdAndStatus(Long productId, String status);
    long countByProductIdAndStatus(Long productId, String status);
    Page<ProductUnit> findByStatus(String status, Pageable pageable);
    Page<ProductUnit> findByProductId(Long productId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductUnit p WHERE p.productId = ?1 AND p.status = 'IN_STOCK' ORDER BY p.importedAt ASC")
    List<ProductUnit> findAvailableForExport(Long productId);
}
