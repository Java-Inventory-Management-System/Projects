package org.dawn.backend.repository.inventory;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.enums.inventory.PurchaseOrderStatus;
import org.dawn.backend.entity.inventory.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    boolean existsByPoCode(String poCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PurchaseOrder p WHERE p.id = :id")
    Optional<PurchaseOrder> findByIdForUpdate(@Param("id") Long id);

    Page<PurchaseOrder> findByStatus(PurchaseOrderStatus status, Pageable pageable);
    List<PurchaseOrder> findByIdIn(List<Long> ids);
}
