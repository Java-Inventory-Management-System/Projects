package org.dawn.backend.repository.inventory.stockcheck;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.dawn.backend.entity.inventory.StockCheck;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockCheckRepository extends JpaRepository<StockCheck, Long> {
    boolean existsByCheckCode(String checkCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockCheck s WHERE s.id = :id")
    Optional<StockCheck> findByIdForUpdate(@Param("id") Long id);

    Page<StockCheck> findByCreatedBy(Long createdBy, Pageable pageable);

    Page<StockCheck> findByCreatedByAndStatus(Long createdBy, StockCheckStatus status, Pageable pageable);

    Page<StockCheck> findByStatus(StockCheckStatus status, Pageable pageable);

    List<StockCheck> findByStatus(StockCheckStatus status);

    List<StockCheck> findByStatusAndCreatedAtBetween(StockCheckStatus status, java.time.Instant from, java.time.Instant to);

    List<StockCheck> findByStatusInAndCreatedAtBefore(List<StockCheckStatus> statuses, java.time.Instant cutoff);

boolean existsByStatusInAndScopeTypeAndScopeId(
        List<StockCheckStatus> statuses, String scopeType, Long scopeId);

    long countByStatus(StockCheckStatus status);
}