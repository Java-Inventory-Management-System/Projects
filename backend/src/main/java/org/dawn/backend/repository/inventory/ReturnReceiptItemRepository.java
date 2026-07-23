package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.ReturnReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnReceiptItemRepository extends JpaRepository<ReturnReceiptItem, Long> {
    List<ReturnReceiptItem> findByReturnReceiptId(Long returnReceiptId);
    List<ReturnReceiptItem> findByReturnReceiptIdIn(List<Long> returnReceiptIds);
}
