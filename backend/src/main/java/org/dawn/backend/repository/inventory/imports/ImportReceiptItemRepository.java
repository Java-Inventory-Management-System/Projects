package org.dawn.backend.repository.inventory.imports;

import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ImportReceiptItemRepository extends JpaRepository<ImportReceiptItem, Long> {
    List<ImportReceiptItem> findByReceiptId(Long receiptId);
    List<ImportReceiptItem> findByReceiptIdIn(Collection<Long> receiptIds);
    void deleteByReceiptId(Long receiptId);
    List<ImportReceiptItem> findByProductId(Long productId);
}
