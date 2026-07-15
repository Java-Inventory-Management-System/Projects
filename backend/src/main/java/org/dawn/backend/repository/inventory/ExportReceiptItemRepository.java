package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExportReceiptItemRepository extends JpaRepository<ExportReceiptItem, Long> {
    List<ExportReceiptItem> findByReceiptId(Long receiptId);
    void deleteByReceiptId(Long receiptId);
}
