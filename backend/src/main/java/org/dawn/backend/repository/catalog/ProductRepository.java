package org.dawn.backend.repository.catalog;

import org.dawn.backend.entity.catalog.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    boolean existsBySku(String sku);
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<Product> findByBrandId(Long brandId, Pageable pageable);
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);
}
