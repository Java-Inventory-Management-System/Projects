package org.dawn.backend.repository.inventory;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.inventory.WarrantyRequestStatus;
import org.dawn.backend.entity.inventory.WarrantyRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WarrantyRequestRepository extends JpaRepository<WarrantyRequest, Long> {
    boolean existsByRequestCode(String requestCode);

    boolean existsByProductUnitIdAndStatus(Long productUnitId, WarrantyRequestStatus status);

    Page<WarrantyRequest> findByStatus(WarrantyRequestStatus status, Pageable pageable);

    Page<WarrantyRequest> findByResolutionType(String resolutionType, Pageable pageable);

    Page<WarrantyRequest> findByStatusAndResolutionType(WarrantyRequestStatus status, String resolutionType, Pageable pageable);

    Page<WarrantyRequest> findByHandledBy(Long handledBy, Pageable pageable);

    List<WarrantyRequest> findByProductUnitIdOrReplacementUnitIdOrderByCreatedAtDesc(
            Long productUnitId, Long replacementUnitId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM WarrantyRequest w WHERE w.id = :id")
    Optional<WarrantyRequest> findByIdForUpdate(@Param("id") Long id);
}
