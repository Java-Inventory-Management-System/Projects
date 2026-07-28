package org.dawn.backend.repository.inventory.exports;

import org.dawn.backend.entity.inventory.ExportReceiptStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExportReceiptStatusHistoryRepository extends JpaRepository<ExportReceiptStatusHistory, Long> {
    List<ExportReceiptStatusHistory> findByReceiptIdOrderByCreatedAtAsc(Long receiptId);
}
