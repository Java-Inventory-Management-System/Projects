package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ProductUnitStatusLogRepository extends JpaRepository<ProductUnitStatusLog, Long> {
    List<ProductUnitStatusLog> findByProductUnitIdOrderByCreatedAtDesc(Long productUnitId);
    List<ProductUnitStatusLog> findByProductUnitIdInOrderByCreatedAtDesc(Collection<Long> productUnitIds);
    List<ProductUnitStatusLog> findBySourceTypeAndSourceId(String sourceType, Long sourceId);
    List<ProductUnitStatusLog> findBySourceTypeOrderByCreatedAtDesc(String sourceType);
}
