package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnReceiptRepository extends JpaRepository<ReturnReceipt, Long> {
    boolean existsByReceiptCode(String receiptCode);
    List<ReturnReceipt> findByOriginalExportReceiptId(Long exportReceiptId);
    List<ReturnReceipt> findByCustomerId(Long customerId);
}
