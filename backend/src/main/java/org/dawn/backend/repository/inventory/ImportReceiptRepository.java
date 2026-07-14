package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.ImportReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ImportReceiptRepository extends JpaRepository<ImportReceipt, Long> {
    Optional<ImportReceipt> findByReceiptCode(String receiptCode);
    Page<ImportReceipt> findByStatus(String status, Pageable pageable);
    Page<ImportReceipt> findBySupplierId(Long supplierId, Pageable pageable);
    boolean existsByReceiptCode(String receiptCode);
    Page<ImportReceipt> findByReceiptCodeStartingWith(String prefix, Pageable pageable);
}
