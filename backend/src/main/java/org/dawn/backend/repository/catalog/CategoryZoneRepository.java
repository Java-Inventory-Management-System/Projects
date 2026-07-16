package org.dawn.backend.repository.catalog;

import org.dawn.backend.entity.catalog.CategoryZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoryZoneRepository extends JpaRepository<CategoryZone, Long> {
    Optional<CategoryZone> findByCategoryId(Long categoryId);
}
