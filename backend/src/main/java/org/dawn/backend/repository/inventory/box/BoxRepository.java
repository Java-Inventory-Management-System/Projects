package org.dawn.backend.repository.inventory.box;

import jakarta.persistence.LockModeType;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.entity.inventory.Box;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BoxRepository extends JpaRepository<Box, Long> {
    Sort BY_NEWEST = Sort.by(Sort.Direction.DESC, "createdAt");

    boolean existsByBoxCode(String boxCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Box b WHERE b.id = :id")
    Optional<Box> findByIdForUpdate(@Param("id") Long id);

    Optional<Box> findByBoxCode(String boxCode);

    List<Box> findByLocationId(Long locationId, Sort sort);

    List<Box> findByLocationIdInAndStatus(List<Long> locationIds, BoxStatus status);

    List<Box> findByStatus(BoxStatus status, Sort sort);

    List<Box> findByLocationIdAndStatus(Long locationId, BoxStatus status, Sort sort);
}
