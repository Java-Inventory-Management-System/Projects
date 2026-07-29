package org.dawn.backend.repository.inventory.returns;

import org.dawn.backend.constant.enums.inventory.returns.ReturnReceiptStatus;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnReceiptRepository extends JpaRepository<ReturnReceipt, Long> {
    boolean existsByReceiptCode(String receiptCode);
    List<ReturnReceipt> findByOriginalExportReceiptId(Long exportReceiptId);
    List<ReturnReceipt> findByCustomerId(Long customerId);
    Page<ReturnReceipt> findByStatus(ReturnReceiptStatus status, Pageable pageable);
    Page<ReturnReceipt> findByReason(String reason, Pageable pageable);
    Page<ReturnReceipt> findByStatusAndReason(ReturnReceiptStatus status, String reason, Pageable pageable);
    Page<ReturnReceipt> findByReceiptCodeContainingIgnoreCase(String receiptCode, Pageable pageable);
}
