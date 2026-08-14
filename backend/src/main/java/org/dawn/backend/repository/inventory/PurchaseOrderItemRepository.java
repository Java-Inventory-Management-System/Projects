package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {
    List<PurchaseOrderItem> findByPoId(Long poId);

    void deleteByPoId(Long poId);
}
