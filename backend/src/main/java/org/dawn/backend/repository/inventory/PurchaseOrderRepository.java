package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    boolean existsByPoCode(String poCode);
    Page<PurchaseOrder> findByStatus(String status, Pageable pageable);
    List<PurchaseOrder> findByIdIn(List<Long> ids);
}
