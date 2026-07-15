package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExportReceiptItemUnitRepository extends JpaRepository<ExportReceiptItemUnit, Long> {
    List<ExportReceiptItemUnit> findByExportReceiptItemId(Long exportReceiptItemId);
    List<ExportReceiptItemUnit> findByProductUnitId(Long productUnitId);
}
