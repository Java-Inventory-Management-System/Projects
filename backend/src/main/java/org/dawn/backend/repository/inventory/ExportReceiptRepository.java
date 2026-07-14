package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.ExportReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExportReceiptRepository extends JpaRepository<ExportReceipt, Long> {
    Optional<ExportReceipt> findByReceiptCode(String receiptCode);
    Page<ExportReceipt> findByStatus(String status, Pageable pageable);
    Page<ExportReceipt> findByCustomerId(Long customerId, Pageable pageable);
    boolean existsByReceiptCode(String receiptCode);
    Page<ExportReceipt> findByReceiptCodeStartingWith(String prefix, Pageable pageable);
}
