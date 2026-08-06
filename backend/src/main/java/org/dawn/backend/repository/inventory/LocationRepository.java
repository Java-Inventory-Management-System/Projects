package org.dawn.backend.repository.inventory;

import jakarta.persistence.LockModeType;
import org.dawn.backend.entity.inventory.Location;
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
public interface LocationRepository extends JpaRepository<Location, Long> {
    Page<Location> findByFullCodeContainingIgnoreCase(String keyword, Pageable pageable);
    Optional<Location> findByFullCode(String fullCode);
    boolean existsByFullCode(String fullCode);
    List<Location> findAllByOrderByZoneCodeAscShelfCodeAscBinCodeAsc();
    List<Location> findByZoneCode(String zoneCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM Location l WHERE l.id = :id")
    Optional<Location> findByIdForUpdate(@Param("id") Long id);
}
