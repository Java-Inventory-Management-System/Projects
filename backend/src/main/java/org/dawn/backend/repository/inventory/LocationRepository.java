package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.Location;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LocationRepository extends JpaRepository<Location, Long> {
    Page<Location> findByFullCodeContainingIgnoreCase(String keyword, Pageable pageable);
    Optional<Location> findByFullCode(String fullCode);
    boolean existsByFullCode(String fullCode);
}
