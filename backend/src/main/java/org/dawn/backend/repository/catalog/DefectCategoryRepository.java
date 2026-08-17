package org.dawn.backend.repository.catalog;

import org.dawn.backend.entity.catalog.DefectCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DefectCategoryRepository extends JpaRepository<DefectCategory, Long> {

    boolean existsByCodeIgnoreCase(String code);

    List<DefectCategory> findAllByOrderByCodeAsc();
}